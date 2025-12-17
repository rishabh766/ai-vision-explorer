import google.generativeai as genai

# PASTE YOUR KEY HERE
KEY = "AIzaSyB1wOqyPzzAw9g5GF87wtjqJ0VwDrnr6co"

genai.configure(api_key=KEY)

try:
    print("Attempting to connect to Gemini...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Hello!' if you can hear me.")
    print("SUCCESS! Gemini said:", response.text)
except Exception as e:
    print("\nFAILED. Here is the exact error:")
    print(e)