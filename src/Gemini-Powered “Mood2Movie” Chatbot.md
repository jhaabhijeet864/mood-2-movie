<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Gemini-Powered “Mood2Movie” Chatbot

A lightweight Flask application that asks users how they feel, calls the Gemini API to fetch **10 tailored movie recommendations**, and serves them through a clean one-page web interface.
Everything runs server-lessly on Vercel’s free Python runtime and stays within the Gemini free-tier limits.

## 1 Tech stack \& key features

| Layer | Choice | Why it fits |
| :-- | :-- | :-- |
| LLM | Gemini 2.5 Flash (model=`gemini-2.5-flash`) | Lowest latency + free-tier 10 RPM \& 250 RPD[^1_1] |
| Backend | Flask 3 + Python 3.12 | Tiny footprint, WSGI ready, officially supported on Vercel Python runtime[^1_2] |
| Frontend | HTML + Tailwind-lite CSS + vanilla JS | Single -page UX, no bundler |
| Hosting | Vercel (Hobby plan) | One-command deploy, automatic HTTPS \& CDN[^1_3] |

**Main flow**

1. User types a mood (“I’m feeling nostalgic and hopeful”).
2. JS sends `POST /recommend` → Flask.
3. Flask builds a structured prompt:
“*Suggest 10 movies for someone who is nostalgic and hopeful. Include title + year + 1-line why it matches the feeling.*”
4. Gemini returns a JSON list which Flask relays as JSON.
5. Front-end renders cards with title, year, blurb.

## 2 Project layout

```
mood2movie/
├─ api/                ← Vercel looks here
│  └─ index.py         ← Flask app
├─ templates/
│  └─ index.html       ← Chat UI
├─ static/
│  ├─ css/style.css
│  └─ js/script.js
├─ requirements.txt
├─ vercel.json
└─ .env.example
```


## 3 Core files (abridged)

### api/index.py

```python
import os, json, google.generativeai as genai
from flask import Flask, render_template, request, jsonify

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

app = Flask(__name__, template_folder="../templates",
            static_folder="../static")

@app.route("/")
def home():
    return render_template("index.html")

@app.post("/recommend")
def recommend():
    mood = request.json.get("mood", "").strip()
    if not mood:
        return jsonify(error="Empty mood"), 400

    prompt = (f"Suggest 10 movies for someone who feels {mood}. "
              "Return JSON array; each item has title, year, reason.")
    resp = model.generate_content(prompt, stream=False)
    # Gemini returns text; ensure JSON compliance
    text = resp.text.strip("` \n")          # remove fencing if any
    movies = json.loads(text)
    return jsonify(movies)
```


### vercel.json

```json
{
  "version": 2,
  "builds": [{ "src": "api/index.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "/api/index.py" }]
}
```


### requirements.txt

```
flask==3.0.3
google-generativeai>=0.4.0
```


## 4 Front-end essentials

### templates/index.html  (minified excerpt)

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8"><title>Mood2Movie</title>
  <link href="/static/css/style.css" rel="stylesheet">
</head>
<body class="bg-slate-100 flex flex-col items-center p-6">
  <h1 class="text-3xl mb-4 font-semibold">Mood-to-Movie Recommender</h1>

  <div class="w-full max-w-xl">
    <input id="mood" placeholder="Describe your mood…" class="w-full p-3 rounded">
    <button id="go" class="mt-3 w-full bg-indigo-600 text-white p-2 rounded">Get movies</button>

    <ul id="results" class="mt-6 space-y-4"></ul>
  </div>

<script src="/static/js/script.js"></script>
</body></html>
```


### static/js/script.js

```js
const moodBox = document.getElementById("mood");
const btn = document.getElementById("go");
const list = document.getElementById("results");

btn.onclick = async () => {
  list.innerHTML = "";
  btn.disabled = true; btn.textContent = "Thinking…";
  const mood = moodBox.value;
  const r = await fetch("/recommend", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ mood })
  });
  const data = await r.json();
  if (r.ok) data.forEach(addCard); else alert(data.error);
  btn.disabled = false; btn.textContent = "Get movies";
};

function addCard(m) {
  list.insertAdjacentHTML("beforeend",
    `<li class="bg-white p-4 rounded shadow">
       <h3 class="font-bold">${m.title} <span class="text-sm text-gray-500">(${m.year})</span></h3>
       <p class="text-gray-700">${m.reason}</p>
     </li>`);
}
```


## 5 Local run

```bash
git clone https://github.com/your-org/mood2movie
cd mood2movie
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY from Google AI Studio[^1_3]
flask --app api/index run --debug
```

Open `http://127.0.0.1:5000`.

## 6 One-command deploy to Vercel

1. Install CLI → `npm i -g vercel`.[^1_3]
2. Run `vercel --prod` in project root and follow prompts.
3. In the Vercel dashboard add `GEMINI_API_KEY` as **Environment Variable** (Project → Settings → Environment).
4. Vercel detects `vercel.json`, builds the Python function, and assigns a public URL.[^1_2]

Updates pushed to the repo trigger automatic redeploys.[^1_3]

## 7 Staying within Gemini free-tier

| Metric | Free tier limit | Bot consumption guideline |
| :-- | :-- | :-- |
| Requests per minute | 10 RPM for Flash[^1_1] | UI throttles button for 6 s after click |
| Requests per day | 250[^1_1] | Good for light hobby use |
| Tokens per minute | 250 k[^1_1] | Prompt \& response ≈ 3 k tokens ⇒ safe |

Upgrade tier in AI Studio once traffic grows.[^1_1]

## 8 Extending the bot

* **Mood detection API**: Swap free-text mood for automatic emotion analysis of a longer journal entry.
* **FastAPI alternative**: For high-concurrency APIs FastAPI’s async handlers deliver ~4-5× more RPS than Flask. Swap `index.py` for FastAPI and keep the same Vercel setup.[^1_4][^1_5]
* **Caching**: Store `{mood → recommendations}` for 24 h to cut LLM calls and token cost.
* **TMDb posters**: Call TMDb API to enrich cards with cover art and links.


### Quick reference: sample prompt patterns

| Mood sample | Prompt fragment sent to Gemini |
| :-- | :-- |
| Happy \& energetic | “…for someone who feels **happy and energetic** and wants upbeat adventures.” |
| Melancholic | “…for a **melancholic** viewer who enjoys reflective, slow-burn dramas.” |
| Anxious \& tired | “…for someone **anxious and tired** who needs gentle, comforting movies.” |

Using structured prompts like these guides Gemini to return tightly relevant lists while staying deterministic.

**The result**: a fully-serverless, low-cost chatbot that turns a vague feeling into a curated movie night—ready to share at your \<vercel-subdomain\>.vercel.app.

<div style="text-align: center">⁂</div>

[^1_1]: https://ai.google.dev/gemini-api/docs/rate-limits

[^1_2]: https://vercel.com/docs/functions/runtimes/python

[^1_3]: https://vercel.com/docs/deployments

[^1_4]: https://www.geeksforgeeks.org/blogs/flask-vs-fastapi/

[^1_5]: https://betterstack.com/community/guides/scaling-python/flask-vs-fastapi/

[^1_6]: https://www.youtube.com/watch?v=CaxPa1FuHx4

[^1_7]: https://www.youtube.com/watch?v=yZ4AXBGUnWA

[^1_8]: https://ai.google.dev/gemini-api/docs/api-key

[^1_9]: https://www.geeksforgeeks.org/python/simple-chatbot-application-using-python-googleapikey/

[^1_10]: https://www.listendata.com/2024/05/how-to-use-gemini-in-python.html

[^1_11]: https://www.merge.dev/blog/gemini-api-key

[^1_12]: https://github.com/FareedKhan-dev/Gemini-AI-chatbot

[^1_13]: https://www.geeksforgeeks.org/artificial-intelligence/getting-started-with-google-gemini-with-python-api-integration-and-model-capabilities/

[^1_14]: https://www.youtube.com/watch?v=6BRyynZkvf0

[^1_15]: https://ai.google.dev/gemini-api/docs/quickstart

[^1_16]: https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart

[^1_17]: https://aistudio.google.com/app/apikey

[^1_18]: https://dev.to/wmisingo/how-you-can-create-your-own-custom-chatbot-with-your-own-custom-data-using-google-gemini-api-all-for-free-iap

[^1_19]: https://ai.google.dev/api

[^1_20]: https://firebase.google.com/docs/ai-logic/get-started

[^1_21]: https://www.youtube.com/watch?v=qfWpPEgea2A

[^1_22]: https://github.com/google-gemini/gemini-api-quickstart

[^1_23]: https://www.youtube.com/shorts/T1BTyo1A4Ww

[^1_24]: https://ai.google.dev/gemini-api/docs/ai-studio-quickstart

[^1_25]: https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Authentication.ipynb

[^1_26]: https://www.kdnuggets.com/fastapi-tutorial-build-apis-with-python-in-minutes

[^1_27]: https://www.digitalocean.com/community/tutorials/how-to-make-a-web-application-using-flask-in-python-3

[^1_28]: https://ijrpr.com/uploads/V6ISSUE5/IJRPR44851.pdf

[^1_29]: https://www.geeksforgeeks.org/python/fastapi-introduction/

[^1_30]: https://www.geeksforgeeks.org/flask-creating-first-simple-application/

[^1_31]: https://github.com/kaushikjadhav01/Movie-Recommendation-Chatbot

[^1_32]: https://fastapi.tiangolo.com/tutorial/first-steps/

[^1_33]: https://flask.palletsprojects.com/en/stable/quickstart/

[^1_34]: https://www.twilio.com/en-us/blog/developers/community/python-sendgrid-openai-movie-recommendation-app

[^1_35]: https://www.youtube.com/watch?v=iWS9ogMPOI0

[^1_36]: https://realpython.com/flask-project/

[^1_37]: https://codelabs.developers.google.com/neo4j-vertexai-movie-recommender-python

[^1_38]: https://fastapi.tiangolo.com/tutorial/

[^1_39]: https://www.geeksforgeeks.org/python/flask-tutorial/

[^1_40]: https://github.com/KG-1510/Movie-recommender-bot

[^1_41]: https://code.visualstudio.com/docs/python/tutorial-fastapi

[^1_42]: https://flask.palletsprojects.com

[^1_43]: https://www.kaggle.com/datasets/armaheshrathod/movie-recommendation-chatbot

[^1_44]: https://www.youtube.com/watch?v=rvFsGRvj9jo

[^1_45]: https://careerfoundry.com/en/blog/web-development/what-is-flask/

[^1_46]: https://www.recursiveautomation.com/second-brain/writing-prompt-generation-with-python-and-free-ai-generated-art/

[^1_47]: https://dev.to/andrewbaisden/how-to-deploy-a-python-flask-app-to-vercel-2o5k

[^1_48]: https://matiasfuentes.hashnode.dev/how-to-deploy-a-flask-web-app-on-vercel

[^1_49]: https://www.feedough.com/chatgpt-prompt-generator/

[^1_50]: https://stackademic.com/blog/simple-guide-on-deploying-python-flask-api-on-vercel-free-of-cost

[^1_51]: https://www.youtube.com/watch?v=o17Fk4Dcn-w

[^1_52]: https://www.geeksforgeeks.org/story-generator-app-using-python/

[^1_53]: https://www.reddit.com/r/flask/comments/1dgqrye/how_to_deploy_flask_apps_on_vercel/

[^1_54]: https://www.reddit.com/r/writing/comments/lo5hym/great_website_for_generating_random_ideas_to_play/

[^1_55]: https://www.youtube.com/watch?v=LaMVBDbUtMA

[^1_56]: https://keploy.io/blog/community/prompt-engineering-for-python-code-generation-with-keploy

[^1_57]: https://es.khanacademy.org/python-program/writing-prompt-generator/4678551137796096

[^1_58]: https://vercel.com/templates/python/python-hello-world

[^1_59]: https://www.youtube.com/watch?v=7-NFFf0ViBY

[^1_60]: https://www.youtube.com/watch?v=miQmOlPF_Gs

[^1_61]: https://www.servicescape.com/writing-prompt-generator

[^1_62]: https://www.youtube.com/watch?v=8R-cetf_sZ4

[^1_63]: https://vercel.com/templates/python/flask-hello-world

[^1_64]: https://www.geeksforgeeks.org/javascript/create-working-chatbot-in-html-css-javascript/

[^1_65]: https://seldomindia.com/making-a-simple-chatbot-using-html-css-and-javascript-step-by-step/

[^1_66]: https://www.cursor-ide.com/blog/gemini-2-5-pro-free-api-limits-guide

[^1_67]: https://www.codecademy.com/article/fastapi-vs-flask-key-differences-performance-and-use-cases

[^1_68]: https://code-b.dev/blog/ai-chat-bot-with-python

[^1_69]: https://firebase.google.com/docs/ai-logic/quotas

[^1_70]: https://www.turing.com/kb/fastapi-vs-flask-a-detailed-comparison

[^1_71]: https://www.youtube.com/watch?v=70H_7C0kMbI

[^1_72]: https://ai.google.dev/gemini-api/docs/pricing

[^1_73]: https://www.reddit.com/r/flask/comments/13pyxie/flask_vs_fastapi/

[^1_74]: https://github.com/topics/python-chatbot

[^1_75]: https://www.reddit.com/r/Bard/comments/1lj4wdp/gemini_free_tier_rate_limits_slashed_again/

[^1_76]: https://www.imaginarycloud.com/blog/flask-vs-fastapi

[^1_77]: https://www.youtube.com/watch?v=B21G6tUI4L0

[^1_78]: https://cloud.google.com/gemini/docs/quotas

[^1_79]: https://blog.jetbrains.com/pycharm/2025/02/django-flask-fastapi/

[^1_80]: https://www.upgrad.com/blog/how-to-make-chatbot-in-python/

