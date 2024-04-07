<template>
  <div>
    <textarea name="语音转文字内容区" id="area" cols="30" rows="10" placeholder="说点什么吧..." ref="areaRef"
      v-model="textInp"></textarea>
    <div>
      <button @click="speek">🎤</button>
      <button @click="addText">发送</button>
    </div>
    <ul v-show="list.length > 0">
      <li v-for="(item, index) in list" :key="index">{{ item }}</li>
    </ul>
  </div>
</template>

<script>
import axios from "axios";
import { reactive, toRefs, ref, onMounted } from 'vue'
import { GoogleGenerativeAI } from "@google/generative-ai";
import useTextToVoice from './utils/useTextToVoice.ts'

export default {
  setup() {
    const areaRef = ref(null)
    const state = reactive({
      list: [],
      textInp: '',
      isGoing: false
    })

    const chatGLM = (value) => {
      axios({
        method: "post",
        url: 'https://chatglm.cn/chatglm/backend-api/assistant/stream',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcxMjA0MDE2NSwianRpIjoiYjAyNmM3ZTgtM2NkYS00MmE1LTlmZWItMDk4YWJhYWE1N2U1IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjcxZDk3NjhlODRiNzQ3MmQ5MGFhZDJjZjI5NGJmZjA2IiwibmJmIjoxNzEyMDQwMTY1LCJleHAiOjE3MTIxMjY1NjUsInVpZCI6IjY1YzEwOGFiZjVlMGVlZWVkYTkxZjZjMSIsInVwbGF0Zm9ybSI6InBjIiwicm9sZXMiOlsidW5hdXRoZWRfdXNlciJdfQ._-h20YfFK-tYFj0BkUmAmtBNxukHNn7iTD8iQQ99z5k'
        },
        data: {
          "assistant_id": "65940acff94777010aa6b796",
          "conversation_id": "",
          "meta_data": {
            "mention_conversation_id": "",
            "is_test": false,
            "input_question_type": "xxxx",
            "channel": "",
            "draft_id": ""
          },
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": `${value}`
                }
              ]
            }
          ]
        }
      }).then(res => {
        console.log(res.data);
      })
    }


    const API_KEY = "AIzaSyAyT5HCorKqYcLJ1VuK69_06q8DH8g_ioc";
    // Access your API key (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(API_KEY);
    async function gemini(value) {
      // For text-only input, use the gemini-pro model
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = value

      const result = await model.generateContent(prompt);

      const response = await result.response;
      const text = response.text();
      const newStr = text.replace(/\*/g, '');
      state.list.push(newStr)
      // useTextToVoice().speak(newStr)
      start(newStr)
      //speak(text)
    }

    function speak(msg) {
      var speech = new SpeechSynthesisUtterance()
      speech.text = msg
      speech.pitch = 1 // 获取并设置话语的音调(0-2 默认1，值越大越尖锐,越低越低沉)
      speech.rate = 0.9 // 获取并设置说话的速度(0.1-10 默认1，值越大语速越快,越小语速越慢)
      speech.volume = 100 // 获取并设置说话的音量
      speech.lang = 'zh-CN' // 设置播放语言
      // 语音播报结束时的回调
      speech.onend = (event) => {
        // 语音播报完需要清空展示内容
      }
    }

    var recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.onresult = function (event) {
      let result = ''
      for (let i = 0; i <= event.resultIndex; i++) {
        result += event.results[i][0].transcript;
      }
      state.textInp = result
    }
    /** 开始 / 结束 录音 */
    function speek() {
      if (state.isGoing) {
        recognition.stop();
        state.isGoing = false;
      }
      else {
        recognition.start();
        state.isGoing = true;
      }

    }
    /** 发布 */
    function addText() {
      state.list.push(state.textInp);
      gemini(state.textInp)
      state.textInp = '';
    }
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
      let ssmlMessage =
        `X-Timestamp:${Date()}\r\n` +
        `X-RequestId:${connectionId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
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
          sendReq(ssml, format, connectionId);
        };
        ws.onclose = (code, reason) => {
          // 服务器会自动断开空闲超过30秒的连接
          ws = null;
          blobs = [];
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
              resolve(url);
            }
          } else if (message.data instanceof Blob) {
            blobs.push(message.data);
          }
        };
        ws.onerror = (error) => {
        };
      });
    }

    async function start(
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
        let format = "audio-24khz-48kbitrate-mono-mp3";
        let result = await connect(SSML, format, autpPlay).then((result) => {
          return result;
        });
        return result;
      }
    }


    return {
      ...toRefs(state),
      areaRef,
      addText,
      speek
    }
  }
}
</script>

<style lang="scss" scoped></style>
