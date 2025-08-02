# import google.generativeai as genai
# import os
# import sys
# import json
# import time
# from moviepy.editor import VideoFileClip
# import os
# import base64
# from PIL import Image
# from io import BytesIO

# video_path = sys.argv[1]



# video = VideoFileClip(video_path)
# duration = video.duration
# output_folder = "frames"+video_path
# os.makedirs(output_folder, exist_ok=True)


# # Alle 0.1 Sekunden ein Bild speichern
# t = 0.0
# step = 0.5
# frame_count = 0

# while t < duration:
#     frame = video.get_frame(t)
#     frame_path = os.path.join(output_folder, f"frame_{frame_count:04d}.jpg")
#     video.save_frame(frame_path, t)
#     t += step
#     frame_count += 1


# # print(f"Gespeichert: {frame_count} Bilder in '{output_folder}'")






# # Authentifizierung (nur nötig, wenn key vorhanden & erlaubt)
# # os.environ["GOOGLE_API_KEY"] = "DEIN_API_KEY"  ← nur bei API-Key Nutzung
# # oder via gcloud application-default-login authentifiziert

# # Modell konfigurieren
# genai.configure(api_key="AIzaSyB-OeOtGEGjcEamRJFkFC8H1oi4mWc1gZ8")  # oder direkt einfügen



# # # Datei hochladen
# # uploaded_file = genai.upload_file(video_path)

# # # Warte-Schleife: Polling bis Status ACTIVE 
# # max_wait = 5  # Sekunden
# # waited = 0

# # while uploaded_file.state != "ACTIVE" and waited < max_wait:
# #     time.sleep(2)
# #     waited += 2
# #     # Datei Status aktualisieren
# #     uploaded_file = genai.get_file(uploaded_file.name)


# # Antwort generieren
# model = genai.GenerativeModel("gemini-2.5-flash-lite")

# max_images = 200  # Anzahl der Frames, die du verwenden willst

# # Hilfsfunktion: Bild zu base64 konvertieren
# def encode_image(file_path):
#     with Image.open(file_path) as img:
#         buffered = BytesIO()
#         img.save(buffered, format="PNG")
#         return {
#             "mime_type": "image/png",
#             "data": base64.b64encode(buffered.getvalue()).decode()
#         }

# # Bilder aus dem Ordner holen
# image_files = sorted([
#     f for f in os.listdir(output_folder)
#     if f.lower().endswith(('.png', '.jpg', '.jpeg'))
# ])[:max_images]

# # <<< DAS ist die Konstante, die du brauchst >>>
# IMAGE_SEQUENCE = [
#     encode_image(os.path.join(output_folder, f)) for f in image_files
# ]




# # prompt.replace("[Insert the sequence of frames here...]", IMAGE_SEQUENCE)
# contents = [prompt] + IMAGE_SEQUENCE
# response = model.generate_content(contents)


# # Ergebnis
# print(json.dumps({
#     "text": response.candidates[0].content.parts[0].text
# }))


import google.generativeai as genai
import time, sys, json

genai.configure(api_key="AIzaSyB-OeOtGEGjcEamRJFkFC8H1oi4mWc1gZ8")

video_path = sys.argv[1]
criteria_json = sys.argv[2]

# Lade JSON-Datei
with open(criteria_json, "r", encoding="utf-8") as f:
    criteria_list = json.load(f)

# Prompt bauen aus den Descriptions
def build_prompt(criteria):
    base = "Please analyze the following sequence of video frames and answer the following questions with 'true' or 'false' and why in a JSON format - { id: <ID>, answer: true, why: ""} if the video clearly fulfills the criterion\n:\n\n"
    questions = [f"ID {item['id']}: {item['description']}" for item in criteria]
    return base + "\n".join(questions)

prompt = build_prompt(criteria_list)


uploaded_file = genai.upload_file(video_path)


time.sleep(5)

# Modell aufrufen mit Datei + Prompt
model = genai.GenerativeModel("gemini-2.5-flash")

response = model.generate_content([
    uploaded_file,
    prompt
])

print(json.dumps({"text": response.text}))
