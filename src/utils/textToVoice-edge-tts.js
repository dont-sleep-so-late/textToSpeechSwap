var voiceList = [
  { ShortName: "zh-CN-XiaoxiaoNeural", label: "Xiaoxiao" },
  { ShortName: "zh-CN-XiaoyiNeural", label: "Xiaoyi" },
  { ShortName: "zh-CN-YunjianNeural", label: "Yunjian" },
  { ShortName: "zh-CN-YunxiNeural", label: "Yunxi" },
  { ShortName: "zh-CN-YunxiaNeural", label: "Yunxia" },
  { ShortName: "zh-CN-YunyangNeural", label: "Yunyang" },
];
let ws = null;
let blobs = [];
let audioElement = document.createElement("audio");

function sendReq(ssml, format, connectionId) {
  let configData = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: "false",
            wordBoundaryEnabled: "false",
          },
          outputFormat: format,
        },
      },
    },
  };
  let configMessage =
    `X-Timestamp:${Date()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    JSON.stringify(configData);
  console.log(`配置请求发送：${configMessage}\n`);
  let ssmlMessage =
    `X-Timestamp:${Date()}\r\n` +
    `X-RequestId:${connectionId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `Path:ssml\r\n\r\n` +
    ssml;
  console.log(`SSML消息发送：${ssmlMessage}\n`);
  ws.send(configMessage, (configError) => {
    if (configError) {
      console.log(`配置请求发送失败：${connectionId}\n`);
    }
  });
  ws.send(ssmlMessage, (ssmlError) => {
    if (ssmlError) {
      console.log(`SSML消息发送失败：${connectionId}\n`);
    }
  });
}

function generateRandomHex() {
  // 创建一个长度为 16 字节的 Uint8Array
  const randomBytes = new Uint8Array(16);
  // 填充数组的每个元素为一个随机的 0-255 之间的整数
  window.crypto.getRandomValues(randomBytes);
  // 将字节数组转换为十六进制字符串，并将字母转换为小写
  const hexString = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();
  return hexString;
}

async function connect(ssml, format, autpPlay) {
  return new Promise((resolve, reject) => {
    const connectionId = generateRandomHex();
    let url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`;
    ws = new window.WebSocket(url);
    ws.onopen = () => {
      console.log("wsOpen");
      sendReq(ssml, format, connectionId);
    };
    ws.onclose = (code, reason) => {
      // 服务器会自动断开空闲超过30秒的连接
      ws = null;
      blobs = [];
      console.log(`连接已关闭： ${reason} ${code}`);
    };
    ws.onmessage = (message) => {
      if (!(message.data instanceof Blob)) {
        let data = message.data.toString();
        if (data.includes("Path:turn.start")) {
          // 开始传输
        } else if (data.includes("Path:turn.end")) {
          // 结束传输
          for (let i = 0; i < blobs.length; i++) {
            let contentIndex = 130;
            if (i == blobs.length - 1) {
              contentIndex = 105;
            }
            blobs[i] = blobs[i].slice(contentIndex);
          }
          let result = new Blob(blobs);
          let url = URL.createObjectURL(result);
          if (autpPlay) {
            audioElement.pause();
            audioElement.src = url;
            audioElement.play();
          }
          blobs = [];
          ws.close();
          console.log(`传输完成：${url}`);
          resolve(url);
        }
      } else if (message.data instanceof Blob) {
        console.log("收到信号了b......", message.data);
        blobs.push(message.data);
      }
    };
    ws.onerror = (error) => {
      console.log(`连接失败： ${error}`);
    };
  });
}

export async function start(
  text,
  voice = 1,
  rate = 0,
  pitch = 0,
  autpPlay = true
) {
  if (text) {
    let SSML = "";
    console.log("text", text);
    console.log("voice", voiceList[voice].ShortName);
    console.log("rate", rate);
    console.log("pitch", pitch);
    SSML = `
    <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
        <voice name="${voiceList[voice].ShortName}">
            <prosody rate="${rate}%" pitch="${pitch}%">
            ${text}
            </prosody>
        </voice>
    </speak>`;
    console.log(SSML);
    let format = "audio-24khz-48kbitrate-mono-mp3";
    let result = await connect(SSML, format, autpPlay).then((result) => {
      console.log("Received result:", result);
      return result;
    });
    return result;
  }
}
