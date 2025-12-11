from openai import OpenAI

client = OpenAI(
    api_key="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",
    base_url="https://api.groq.com/openai/v1"
)

response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[{"role": "user", "content": "Test"}]
)
print(response.choices[0].message.content)
