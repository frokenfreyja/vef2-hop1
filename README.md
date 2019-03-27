# Hópverkefni 1

## Uppsetning á verkefni

1. Búa þarf til gagnagrunn með ákveðnu heiti
2. Setja þarf upp .env skrá og færa inn eftirfarandi gildi í hana:
  * DATABASE_URL - á forminu postgres://username:password@localhost:5432/heiti
    * Username er notendanafn fyrir postgres
    * Password er lykilorð fyrir postgres
    * Heiti er heitið á gagnagrunninum
  * PORT - sem vefurinn á að vera keyrður á
  * HOST - sem vefurinn á að vera keyrður á
  * JWT_SECRET sem er leyndarmál sem notað er í undirskrift á token
  * CLOUDINARY_URL, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_CLOUD, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_API_KEY, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_API_SECRET, stilling fyrir cloudinary, fengin úr cloudinary console
3. Keyra þarf skipunina 'npm install' til þess að ná í alla pakka 
4. Keyra þarf skipunina 'npm run setup -s' í verkefnamöppu sem setur upp töflur og setur gögn í þær
5. Keyra þarf skipunina 'npm start' í verkefnamöppu

## Dæmi um köll í vefþjónustu

Dæmi um köll

## Innskráning

Stjórnandi: Admin er með netfangið 'admin@admin.is' og lykilorðið 'password'

Notandi: User er með netfangið 'user@user.is' og lykilorðið 'password'

Til að innskrá sig þarf að kalla á /users/login með POST
í body þarf að vera

{

  "email": "userEmail",
  
  "password": "userPassword"
  
}

þar sem userEmail er netfang notanda og userPassword er lykilorð notanda

## Nöfn og notendanöfn hópmeðlima

Freyja Sigurgísladóttir - frs24@hi.is - frokenfreyja á github

Henrietta Þóra Magnúsdóttir - hthm6@hi.is - HennyM á github

Kristín María Tómasdóttir - kmt3@hi.is - krimtom á github
