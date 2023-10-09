---
title: Is public Wi-Fi safe?
subtitle: Open Wi-Fi's are a dilemma: There is a clear preference to personal cellular data on matters like messaging or banking, but everybody who has foudn themselves in a foreign country's aiport without internet access is quickly willing to bend their morals. What are the real risks. 

# Summary for listings and search engines
summary: Meta-learning summarizes the concept of learning a more general framework to learn – hence the name. Yet, this concept subsumizes a range of multiple concepts, including transfer learning, few-shot learning, continual learning, and fine-tuning. We develop an abstracted framework that unifies these notions. This extends beyond parametric models. 

# Link this post with a project
projects: []

# Date published
date: '2023-06-03T00:00:00Z'

# Date updated
date: '2023-06-03T00:00:00Z'

# Is this an unpublished draft?
draft: true

# Show this page in the Featured widget?
featured: true

share: false

# Featured image
# Place an image named `featured.jpg/png` in this page's folder and customize its options here.
# image:
#  caption: "The sorcerer's apprentice. "
#  focal_point: ''
#  placement: 2
#  preview_only: false


# try out the suggestion in the comments!
# https://roneo.org/en/hugo-include-another-file-with-a-shortcode/

authors:
  - admin

tags:
  - Security
---

The main risk when connecting to a public Wi-Fi is a honeypot. Somebody is impersonating the actual airport authority's access point, and offering the sweet benefits of the internet – hence the name. If I fall for it – what are the consequences?

### Is my personal data exposed?
Modern devices communicate over a protocol called HTTPS. This by default encrypts all traffic between sender Alice and recipient Bob. But how can they agree on a key without exposing it to Eve, who runs the honeypot? To this end, they use a [**key-exchange protocol**](https://en.wikipedia.org/wiki/Diffie–Hellman_key_exchange): 


1 . Bob first sends his signature. Only he can draw it and we know how it looks, so we now its him! (In practice, he sends a certificate signed with his private key that we can check against his public key).  
2. They generate keys. Pictorially, they each take the picture of each other's signature and just draw their personal signature on top of it, and keep it for themselves. While the technical details are based on the mathematical underpinnings of public-key cryptography, this captures the essence of the procedure: Both parties end up with something which they now the other one holds likewise, but no-one else is able to obtain. They make this weird, blended image their *shared secret* and use it to encrypt their exchange from there on. 

### What about password protected Wi-Fis?
Airport Wi-Fis are pretty secure from this point of view, yet, they have everybody on the same network. Sometimes, one wants a little more privacy, for exampel to prevent your neighbors from slowing down your connection or using your printer. This is where password-protected Wi-Fis come in. They are, a priori, vulnarable to a related honeypot attack: 
Let's say your Wi-Fis name (SSID) is ```Lan Solo```. Your neighbor Eve could take note of this, and just set up a very strong access point next door. The moment you come home, your phone would connect to their honeypot, broadcasting to be ```Lan Solo```. Your phone falls for it, sends them your passphrase (the PMK), and mission succeeded – free prints forever. Or do they?

#### The four-way handshake
Wi-Fi clients such as your phone don't send out your secret readily, in the same way that you would not teach random people how to fake your signature. Instead, access point and client follow a protocol that does what they need: The access point wants to whether the client is authenticated, and the client wants to ensure that the access point is no honeypot. 

A very simple variant could just take a sufficiently long message in plain English and encrypt it with the PMK. If the other party can decode the message, they know that the other party must hold the PMK. This works with cables. But what if we are transmitting things over plain air? Couln't I drop in the honeypot quickly in between after the participants have already convinced themselves?

This is where the full protocol of the [four-way handshake](https://en.wikipedia.org/wiki/IEEE_802.11i-2004) comes in. I here break down the respective section from Wikipedia. 

1. **ANonce (AP to Client):**
The AP sends a picture of their signature to the client. 


2. **SNonce (Client to AP):**
The Client draws its signature on top of the received one, and in addition draws the signature that is the PMK on top. This forms the key that will be used for communication, called the PTK. 
Then, it broadcasts a picture of its signature. 


3. **(AP to Client):** The AP paints their signature and the PMK on top of the received picture. Now, each party has a key comprising of their, the other party's and the PMK signature, arriving at the same PTK. This object is very similar to the shared that we arrived at via the key-exchange protocol before. 
   
4. **Acknowledgment (Client to AP):**
The client acknowledges the previous message.


A crucial step in this is that the PMK is drawn on top of the signatures. This ensures that the communicating parties are indeed the ones holding the key. 

# TODO
Why don't we just encrypt everything with the PMK to begin with, and we are done?