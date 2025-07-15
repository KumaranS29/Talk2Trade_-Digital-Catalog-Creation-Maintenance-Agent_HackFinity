import speech_recognition as sr
from googletrans import Translator
from gtts import gTTS
import pyttsx3
import os

# Initialize
recognizer = sr.Recognizer()
translator = Translator()
engine = pyttsx3.init()

# Function to speak
def speak(text):
    engine.say(text)
    engine.runAndWait()

# Function to get text input or voice
def get_input(mode='text', lang='en'):
    if mode == 'text':
        return input("Enter your message: ")
    elif mode == 'voice':
        with sr.Microphone() as source:
            print("Listening...")
            audio = recognizer.listen(source)
            try:
                # Detect language
                return recognizer.recognize_google(audio, language=lang)
            except Exception as e:
                print("Error:", e)
                return ""

# Language code mapping
lang_map = {
    'english': 'en',
    'tamil': 'ta',
    'hindi': 'hi'
}

def main():
    print("Choose input mode:\n1. Text\n2. Voice")
    mode_choice = input("Enter 1 or 2: ")

    mode = 'text' if mode_choice == '1' else 'voice'

    print("Select Language:\n1. English\n2. Tamil\n3. Hindi")
    lang_choice = input("Enter 1/2/3: ")

    lang_selected = 'english' if lang_choice == '1' else ('tamil' if lang_choice == '2' else 'hindi')
    lang_code = lang_map[lang_selected]

    # Step 1: Get initial message
    user_msg = get_input(mode, lang_code)
    print(f"User Message ({lang_selected}):", user_msg)

    # Step 2: Translate to English if needed
    if lang_selected != 'english':
        try:
            user_msg = translator.translate(user_msg, src=lang_code, dest='en').text
            print("Translated Message:", user_msg)
        except Exception as e:
            print("Translation failed:", e)
            return

    # Step 3: Ask for KG
    kg = input("Enter quantity (kg): ")

    # Step 4: Ask for Rate
    rate = input("Enter rate per kg: ")

    try:
        total = float(kg) * float(rate)
        print(f"Total Price: ₹{total}")
        speak(f"The total price is {total} rupees")
    except:
        print("Invalid input for kg or rate.")

if __name__ == "__main__":
    main()
