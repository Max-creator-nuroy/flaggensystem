from pyngrok import ngrok

# Setze deinen Auth-Token, wenn du einen hast (optional)
# ngrok.set_auth_token("DEIN_TOKEN")
ngrok.set_auth_token("30gPHNVB8fgL0s35mKQBFEbZJu1_6xCvF1uVqrdvQLqqCQA5Z")
# Öffnet einen HTTP-Tunnel zu Port 3000 (dein Express-Server)
public_url = ngrok.connect(3000)
print("Ngrok läuft unter:", public_url)

# Offenes Ende halten, damit Tunnel nicht schließt
input("Drücke Enter zum Beenden...")
