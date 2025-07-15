import speech_recognition as sr

# Initialize recognizer
recognizer = sr.Recognizer()

# Use microphone as source
with sr.Microphone() as source:
    print("🎙️ Adjusting for ambient noise... Please wait.")
    recognizer.adjust_for_ambient_noise(source)

    print("🎤 Speak now:")
    try:
        # Listen from mic
        audio_data = recognizer.listen(source, timeout=5)
        print("🔁 Processing...")

        # Convert to text using Google Web Speech API
        text = recognizer.recognize_google(audio_data)
        print("\n✅ Recognized Text:\n")
        print(text)

    except sr.UnknownValueError:
        print("❌ Could not understand your voice.")
    except sr.WaitTimeoutError:
        print("⏳ Listening timed out. Please try again.")
    except sr.RequestError as e:
        print(f"⚠️ Could not request results from Google Speech Recognition service; {e}")
