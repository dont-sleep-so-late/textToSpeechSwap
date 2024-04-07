const useTextToVoice = (gap = 1000, voiceType = 0) => {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const utteranceQueue: any[] = []; // 待播报文本队列

  const checkVoiceSupport = () => {
    const isSupport = "speechSynthesis" in window;
    if (!isSupport) {
      alert("您的浏览器不支持文本转语音功能。请更换浏览器或者升级浏览器版本。");
    }
    return isSupport;
  };

  const speak = (text: string | undefined) => {
    if (!checkVoiceSupport()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[voiceType];

    // 如果有待播报的文本或者正在播报中，将文本添加到队列中
    if (synth.pending || synth.speaking) {
      utteranceQueue.push(text);
    } else {
      synth.speak(utterance);
    }

    utterance.onend = () => {
      console.log("speak end");
      // 检查队列中是否还有待播报的文本
      if (utteranceQueue.length > 0) {
        const nextText = utteranceQueue.shift();

        setTimeout(() => speak(nextText), gap);
      }
    };
  };

  return { speak };
};

export default useTextToVoice;
