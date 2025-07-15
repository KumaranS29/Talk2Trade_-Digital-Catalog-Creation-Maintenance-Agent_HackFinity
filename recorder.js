let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const statusText = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");

startBtn.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('model', 'whisper-1');

    statusText.innerText = "Uploading to Whisper API...";

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer OpenAI_API_Key" // Replace this
      },
      body: formData
    });

    const data = await response.json();
    transcriptEl.innerText = "Transcript: " + data.text;
    statusText.innerText = "✅ Transcribed Successfully";
  };

  mediaRecorder.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;
  statusText.innerText = "🎙️ Recording...";
});

stopBtn.addEventListener("click", () => {
  mediaRecorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.innerText = "🔄 Processing...";
});
