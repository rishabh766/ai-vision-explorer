import google.generativeai as genai

# PASTE YOUR KEY HERE
GOOGLE_API_KEY = "AIzaSyB1wOqyPzzAw9g5GF87wtjqJ0VwDrnr6co"
genai.configure(api_key=GOOGLE_API_KEY)

print("Listing available models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"- {m.name}")