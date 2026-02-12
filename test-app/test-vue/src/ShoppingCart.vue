<template>
  <div class="shopping-cart">
    <!-- tomato -->
    <div class="tomato">
      <!-- heirloomTomato -->
      <span class="heirloom-tomato">Heirloom tomato</span>
      <!-- 599 -->
      <span class="element">$5.99</span>
      <!-- 599Lb -->
      <span class="lb">$5.99 / lb</span>
      <!-- inputField -->
      <div class="input-field">
        <!-- 1Lb -->
        <span class="lb-1">1 lb</span>
        <!-- icon -->
        <div class="icon">
          <!-- union -->
          <div class="union">
            <!-- union -->
            <div class="union-1">
              <!-- rectangle4 -->
              <div class="rectangle4" />
              <!-- rectangle5 -->
              <div class="rectangle5" />
            </div>
          </div>
        </div>
      </div>
      <!-- edONeil -->
      <img class="ed-oneil" :src="imged_o_neil_avvdzlhdowa_unsplash_1" alt="edONeil" />
    </div>
    <!-- ginger -->
    <div class="ginger">
      <!-- organicGinger -->
      <span class="organic-ginger">Organic ginger</span>
      <!-- 1299Lb -->
      <span class="lb-2">$12.99 / lb</span>
      <!-- inputField -->
      <div class="input-field-1">
        <!-- 05Lb -->
        <span class="lb-3">0.5 lb</span>
        <!-- icon -->
        <div class="icon-1">
          <!-- union -->
          <div class="union-2">
            <!-- union -->
            <div class="union-3">
              <!-- rectangle4 -->
              <div class="rectangle4-1" />
              <!-- rectangle5 -->
              <div class="rectangle5-1" />
            </div>
          </div>
        </div>
      </div>
      <!-- 650 -->
      <span class="element-1">$6.50</span>
      <!-- noonbrewZicb4Ekmak -->
      <img class="noonbrew-zicb4ekmak" :src="imgnoonbrew_zicb4_ekmak_unsplash" alt="noonbrewZicb4Ekmak" />
    </div>
    <!-- onion -->
    <div class="onion">
      <!-- sweetOnion -->
      <span class="sweet-onion">Sweet onion</span>
      <!-- 299Lb -->
      <span class="lb-4">$2.99 / lb</span>
      <!-- inputField -->
      <div class="input-field-2">
        <!-- 5Lb -->
        <span class="lb-5">5 lb</span>
        <!-- icon -->
        <div class="icon-2">
          <!-- union -->
          <div class="union-4">
            <!-- union -->
            <div class="union-5">
              <!-- rectangle4 -->
              <div class="rectangle4-2" />
              <!-- rectangle5 -->
              <div class="rectangle5-2" />
            </div>
          </div>
        </div>
      </div>
      <!-- 1495 -->
      <span class="element-2">$14.95</span>
      <!-- k80Fkphulv -->
      <img class="k80fkphulv" :src="imgk8_0_fkphulv_m_unsplash_2" alt="k80Fkphulv" />
    </div>
    <!-- summary -->
    <div class="summary">
      <!-- orderSummary -->
      <span class="order-summary">Order summary</span>
      <!-- subtotal -->
      <span class="subtotal">Subtotal</span>
      <!-- 2744 -->
      <span class="element-3">$27.44</span>
      <!-- shipping -->
      <span class="shipping">Shipping</span>
      <!-- 399 -->
      <span class="element-4">$3.99</span>
      <!-- tax -->
      <span class="tax">Tax</span>
      <!-- 200 -->
      <span class="element-5">$2.00</span>
      <!-- total -->
      <span class="total">Total</span>
      <!-- 3343 -->
      <span class="element-6">$33.43</span>
      <!-- button -->
      <div class="button">
        <!-- continueToPayment -->
        <span class="continue-to-payment">Continue to payment</span>
      </div>
    </div>
    <!-- pageHeading -->
    <div class="page-heading">
      <!-- 3Items -->
      <span class="items">3 items</span>
      <!-- basket -->
      <span class="basket">Basket</span>
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
  </div>
</template>

<script setup>
import imged_o_neil_avvdzlhdowa_unsplash_1 from './assets/ed-o-neil-avvdzlhdowa-unsplash-1.png'
import imgnoonbrew_zicb4_ekmak_unsplash from './assets/noonbrew-zicb4_ekmak-unsplash.png'
import imgk8_0_fkphulv_m_unsplash_2 from './assets/k8-0_fkphulv-m-unsplash-2.png'
</script>

<style scoped>
.shopping-cart {
  position: relative;
  max-width: 1440px;
  margin: 0 auto;
  height: 1024px;
  background-color: rgba(255, 255, 255, 1);
}

.tomato {
  position: absolute;
  left: 96px;
  top: 301px;
  width: 821px;
  height: 159px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.heirloom-tomato {
  position: absolute;
  left: 184px;
  top: 24px;
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

.element {
  position: absolute;
  left: 740px;
  top: 24px;
  width: 57px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.lb {
  position: absolute;
  left: 184px;
  top: 54px;
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

.input-field {
  position: absolute;
  left: 184px;
  top: 95px;
  width: 128px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
}

.lb-1 {
  position: absolute;
  left: 16px;
  top: 10px;
  width: 26px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.icon {
  position: absolute;
  left: 88px;
  top: 4px;
  width: 32px;
  height: 32px;
  overflow: hidden;
}

.union {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 16px;
  height: 16px;
  overflow: hidden;
  background-color: rgba(109, 109, 109, 1);
}

.union-1 {
  position: absolute;
  left: -2px;
  top: -1px;
  width: 19px;
  height: 19px;
  overflow: hidden;
}

.rectangle4 {
  position: absolute;
  left: 3px;
  top: 0px;
  width: 16px;
  height: 16px;
  background-color: rgba(255, 0, 255, 1);
}

.rectangle5 {
  position: absolute;
  left: 0px;
  top: 12px;
  width: 7px;
  height: 7px;
  background-color: rgba(255, 0, 255, 1);
}

.ed-oneil {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 160px;
  height: 160px;
  object-fit: cover;
  display: block;
}

.ginger {
  position: absolute;
  left: 96px;
  top: 491px;
  width: 821px;
  height: 159px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.organic-ginger {
  position: absolute;
  left: 184px;
  top: 24px;
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

.lb-2 {
  position: absolute;
  left: 184px;
  top: 54px;
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

.input-field-1 {
  position: absolute;
  left: 184px;
  top: 95px;
  width: 128px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
}

.lb-3 {
  position: absolute;
  left: 16px;
  top: 10px;
  width: 44px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.icon-1 {
  position: absolute;
  left: 88px;
  top: 4px;
  width: 32px;
  height: 32px;
  overflow: hidden;
}

.union-2 {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 16px;
  height: 16px;
  overflow: hidden;
  background-color: rgba(109, 109, 109, 1);
}

.union-3 {
  position: absolute;
  left: -2px;
  top: -1px;
  width: 19px;
  height: 19px;
  overflow: hidden;
}

.rectangle4-1 {
  position: absolute;
  left: 3px;
  top: 0px;
  width: 16px;
  height: 16px;
  background-color: rgba(255, 0, 255, 1);
}

.rectangle5-1 {
  position: absolute;
  left: 0px;
  top: 12px;
  width: 7px;
  height: 7px;
  background-color: rgba(255, 0, 255, 1);
}

.element-1 {
  position: absolute;
  left: 740px;
  top: 24px;
  width: 57px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.noonbrew-zicb4ekmak {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 160px;
  height: 160px;
  object-fit: cover;
  display: block;
}

.onion {
  position: absolute;
  left: 96px;
  top: 681px;
  width: 821px;
  height: 159px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.sweet-onion {
  position: absolute;
  left: 184px;
  top: 24px;
  width: 120px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.lb-4 {
  position: absolute;
  left: 184px;
  top: 54px;
  width: 93px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(66, 107, 31, 1);
}

.input-field-2 {
  position: absolute;
  left: 184px;
  top: 95px;
  width: 128px;
  height: 40px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
}

.lb-5 {
  position: absolute;
  left: 16px;
  top: 10px;
  width: 29px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.icon-2 {
  position: absolute;
  left: 88px;
  top: 4px;
  width: 32px;
  height: 32px;
  overflow: hidden;
}

.union-4 {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 16px;
  height: 16px;
  overflow: hidden;
  background-color: rgba(109, 109, 109, 1);
}

.union-5 {
  position: absolute;
  left: -2px;
  top: -1px;
  width: 19px;
  height: 19px;
  overflow: hidden;
}

.rectangle4-2 {
  position: absolute;
  left: 3px;
  top: 0px;
  width: 16px;
  height: 16px;
  background-color: rgba(255, 0, 255, 1);
}

.rectangle5-2 {
  position: absolute;
  left: 0px;
  top: 12px;
  width: 7px;
  height: 7px;
  background-color: rgba(255, 0, 255, 1);
}

.element-2 {
  position: absolute;
  left: 730px;
  top: 24px;
  width: 67px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.k80fkphulv {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 160px;
  height: 160px;
  object-fit: cover;
  display: block;
}

.summary {
  position: absolute;
  left: 949px;
  top: 301px;
  width: 395px;
  height: 318px;
  overflow: hidden;
  background-color: rgba(250, 250, 245, 1);
  border-radius: 24px;
}

.order-summary {
  position: absolute;
  left: 24px;
  top: 24px;
  width: 151px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.subtotal {
  position: absolute;
  left: 24px;
  top: 82px;
  width: 64px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.element-3 {
  position: absolute;
  left: 319px;
  top: 82px;
  width: 52px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.shipping {
  position: absolute;
  left: 24px;
  top: 119px;
  width: 66px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.element-4 {
  position: absolute;
  left: 326px;
  top: 119px;
  width: 45px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.tax {
  position: absolute;
  left: 24px;
  top: 156px;
  width: 27px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.element-5 {
  position: absolute;
  left: 327px;
  top: 156px;
  width: 44px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.total {
  position: absolute;
  left: 24px;
  top: 193px;
  width: 39px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.element-6 {
  position: absolute;
  left: 314px;
  top: 190px;
  width: 57px;
  height: 21px;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 24px;
  top: 246px;
  width: 347px;
  height: 48px;
  overflow: hidden;
  background-color: rgba(66, 107, 31, 1);
  border-radius: 8px;
}

.continue-to-payment {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
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

.items {
  position: absolute;
  left: 301px;
  top: 90px;
  width: 69px;
  height: 26px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 300;
  line-height: 26px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.basket {
  position: absolute;
  left: 96px;
  top: 56px;
  width: 181px;
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
  border-radius: 4px;
}

.basket3 {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 21px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}
</style>
