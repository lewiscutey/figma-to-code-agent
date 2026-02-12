<template>
  <div class="product-page">
    <!-- pageHeading -->
    <div class="page-heading">
      <!-- defaultChip -->
      <div class="default-chip">
        <!-- default -->
        <span class="default">Default</span>
      </div>
      <!-- aZChip -->
      <div class="a-zchip">
        <!-- az -->
        <span class="az">A-Z</span>
      </div>
      <!-- listChip -->
      <div class="list-chip">
        <!-- listView -->
        <span class="list-view">List view</span>
      </div>
      <!-- freshAugust21 -->
      <span class="fresh-august21">Fresh  —  August 21, 2023</span>
      <!-- produce -->
      <span class="produce">Produce</span>
    </div>
    <!-- navigation -->
    <div class="navigation">
      <!-- worldPeas -->
      <span class="world-peas">World Peas</span>
      <!-- shop -->
      <span class="shop">Shop</span>
      <!-- newstand -->
      <span class="newstand">Newstand</span>
      <!-- whoWeAre -->
      <span class="who-we-are">Who we are</span>
      <!-- myProfile -->
      <span class="my-profile">My profile</span>
      <!-- cartButton -->
      <div class="cart-button">
        <!-- basket3 -->
        <span class="basket3">Basket (3)</span>
      </div>
    </div>
    <!-- tomato -->
    <div class="tomato">
      <!-- heirloomTomato -->
      <span class="heirloom-tomato">Heirloom tomato</span>
      <!-- 599Lb -->
      <span class="lb">$5.99 / lb</span>
      <!-- grownInSan -->
      <span class="grown-in-san">Grown in San Juan Capistrano, CA</span>
      <!-- edONeil -->
      <img class="ed-oneil" :src="imged_o_neil_avvdzlhdowa_unsplash_1" alt="edONeil" />
    </div>
    <!-- ginger -->
    <div class="ginger">
      <!-- organicGinger -->
      <span class="organic-ginger">Organic ginger</span>
      <!-- 1299Lb -->
      <span class="lb-1">$12.99 / lb</span>
      <!-- grownInHuntington -->
      <span class="grown-in-huntington">Grown in Huntington Beach, CA</span>
      <!-- noonbrewZicb4Ekmak -->
      <img class="noonbrew-zicb4ekmak" :src="imgnoonbrew_zicb4_ekmak_unsplash" alt="noonbrewZicb4Ekmak" />
    </div>
  </div>
</template>

<script setup>
import imged_o_neil_avvdzlhdowa_unsplash_1 from './assets/ed-o-neil-avvdzlhdowa-unsplash-1.png'
import imgnoonbrew_zicb4_ekmak_unsplash from './assets/noonbrew-zicb4_ekmak-unsplash.png'
</script>

<style scoped>
.product-page {
  position: relative;
  max-width: 1440px;
  margin: 0 auto;
  height: 1024px;
  background-color: rgba(255, 255, 255, 1);
}

.page-heading {
  position: absolute;
  left: 0px;
  top: 112px;
  width: 1440px;
  height: 149px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
}

.default-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 1077px;
  top: 76px;
  width: 88px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(66, 107, 31, 1);
  border-radius: 20px;
}

.default {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.a-zchip {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 1173px;
  top: 76px;
  width: 62px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
}

.az {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.list-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 1243px;
  top: 76px;
  width: 101px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
}

.list-view {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.fresh-august21 {
  position: absolute;
  left: 347px;
  top: 90px;
  width: 248px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.produce {
  position: absolute;
  left: 96px;
  top: 56px;
  width: 227px;
  height: 77px;
  font-family: 'Newsreader', sans-serif;
  font-size: 64px;
  font-weight: 400;
  line-height: 77px;
  letter-spacing: -1.28px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.navigation {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 1440px;
  height: 112px;
  overflow: hidden;
}

.world-peas {
  position: absolute;
  left: 96px;
  top: 41px;
  width: 151px;
  height: 32px;
  font-family: 'Newsreader', sans-serif;
  font-size: 32px;
  font-weight: 500;
  line-height: 32px;
  letter-spacing: -0.32px;
  text-align: left;
  white-space: nowrap;
  color: rgba(66, 107, 31, 1);
}

.shop {
  position: absolute;
  left: 744px;
  top: 46px;
  width: 39px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: center;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.newstand {
  position: absolute;
  left: 831px;
  top: 46px;
  width: 77px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: center;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.who-we-are {
  position: absolute;
  left: 956px;
  top: 46px;
  width: 90px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: center;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.my-profile {
  position: absolute;
  left: 1094px;
  top: 46px;
  width: 76px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: center;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.cart-button {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 1218px;
  top: 32px;
  width: 126px;
  height: 48px;
  overflow: hidden;
  background-color: rgba(66, 107, 31, 1);
  border-radius: 8px;
}

.basket3 {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.tomato {
  position: absolute;
  left: 96px;
  top: 301px;
  width: 395px;
  height: 444px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.heirloom-tomato {
  position: absolute;
  left: 24px;
  top: 320px;
  width: 162px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.lb {
  position: absolute;
  left: 24px;
  top: 350px;
  width: 92px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(66, 107, 31, 1);
}

.grown-in-san {
  position: absolute;
  left: 24px;
  top: 392px;
  width: 259px;
  height: 24px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-align: left;
  white-space: nowrap;
  color: rgba(109, 109, 109, 1);
}

.ed-oneil {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 395px;
  height: 296px;
  object-fit: cover;
  display: block;
}

.ginger {
  position: absolute;
  left: 523px;
  top: 301px;
  width: 395px;
  height: 444px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.organic-ginger {
  position: absolute;
  left: 24px;
  top: 320px;
  width: 144px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.lb-1 {
  position: absolute;
  left: 24px;
  top: 350px;
  width: 102px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(66, 107, 31, 1);
}

.grown-in-huntington {
  position: absolute;
  left: 24px;
  top: 392px;
  width: 239px;
  height: 24px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-align: left;
  white-space: nowrap;
  color: rgba(109, 109, 109, 1);
}

.noonbrew-zicb4ekmak {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 395px;
  height: 296px;
  object-fit: cover;
  display: block;
}
</style>
