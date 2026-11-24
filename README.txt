MAIDANMOUSSECUPS - WEBSITE PUBLISH KARNE KE STEPS (sirf ek baar, ~15 minute)

Kya chahiye: ek email id. Teen free accounts: GitHub, Upstash, Render.

STEP 1 - UPSTASH (photos aur orders ko hamesha save rakhne ke liye)
 1. upstash.com kholo, "Sign up" karo (Google se ho jata hai).
 2. "Create Database" dabao. Name: maidan. Region: Mumbai ya Singapore. Free plan chuno. Create.
 3. Neeche "REST API" section milega. Wahan 2 cheezein hain:
      UPSTASH_REDIS_REST_URL
      UPSTASH_REDIS_REST_TOKEN
    Dono ko copy karke Notes/WhatsApp mein save kar lo.

STEP 2 - GITHUB (files rakhne ke liye)
 1. github.com par sign up karo.
 2. Upar "+" > "New repository". Name: maidan-cakes. "Public" chuno. Create.
 3. "uploading an existing file" link dabao.
 4. Is folder ki saari files (app.js, index.html, package.json, render.yaml, .gitignore) drag karke daalo.
 5. Neeche "Commit changes" dabao.

STEP 3 - RENDER (website chalane ke liye)
 1. render.com par GitHub se sign up karo.
 2. "New +" > "Blueprint" dabao. Apni maidan-cakes repository chuno > Connect.
 3. Ye 3 cheezein poochega:
      OWNER_PIN                 -> apna PIN likho (jaise 5 ya 6 number). 1234 mat rakhna.
      UPSTASH_REDIS_REST_URL    -> Step 1 wala copy kiya hua
      UPSTASH_REDIS_REST_TOKEN  -> Step 1 wala copy kiya hua
 4. "Deploy Blueprint" dabao. 3-5 minute ruko.
 5. Upar link milega jaise https://maidan-cakes.onrender.com - yahi aapki website hai.

OWNER KAISE USE KARE
 - Website ke neeche "Owner" dabao, PIN daalo.
 - Photo badalna, rate/stock/naam badalna, sab wahin se. Badalne ke baad "Publish changes" dabao.
 - Orders ki list wahin dikhegi. Word ya PDF download ke buttons wahin hain.
 - PIN badalna ho to owner panel mein option hai.
 - IMPORTANT: hamesha Render wale link se hi Owner mein jao, kisi purani file se nahi.

YAAD RAKHO
 - Free plan par site kuch der use na ho to so jati hai. Pehla load 30-50 second le sakta hai. Phir normal.
 - Photo/orders Upstash mein safe rehte hain, restart par nahi udte.
