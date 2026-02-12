<template>
  <div class="homepage">
    <!-- wereFarmersPurveyors -->
    <span class="were-farmers-purveyors">We’re farmers, purveyors, and eaters of organically grown food.</span>
    <!-- button -->
    <div class="button">
      <!-- browseOurShop -->
      <span class="browse-our-shop">Browse our shop</span>
    </div>
    <!-- weBelieveIn -->
    <span class="we-believe-in">We believe in produce. Tasty produce. Produce like:

    Apples. Oranges. Limes. Lemons. Guavas. Carrots. Cucumbers. Jicamas. Cauliflowers. Brussels sprouts. Shallots. Japanese eggplants. Asparagus. Artichokes—Jerusalem artichokes, too. Radishes. Broccoli. Baby broccoli. Broccolini. Bok choy. Scallions. Ginger. Cherries. Raspberries. Cilantro. Parsley. Dill. 

    What are we forgetting?

    Oh! Onions. Yams. Avocados. Lettuce. Arugula (to some, “rocket”). Persian cucumbers, in addition to aforementioned “normal” cucumbers. Artichokes. Zucchinis. Pumpkins. Squash (what some cultures call pumpkins). Sweet potatoes and potato-potatoes. Jackfruit. Monk fruit. Fruit of the Loom. Fruits of our labor (this website). Sorrel. Pineapple. Mango. Gooseberries. Blackberries. Tomatoes. Heirloom tomatoes. Beets. Chives. Corn. Endive. Escarole, which, we swear, we’re vendors of organic produce, but if you asked us to describe what escaroles are...</span>
    <!-- whatWeBelieve -->
    <span class="what-we-believe">WHAT WE BELIEVE</span>
    <!-- jonathanKemper1hhrdiolfpu -->
    <img class="jonathan-kemper1hhrdiolfpu" :src="imgjonathan_kemper_1hhrdiolfpu_unsplash_1" alt="jonathanKemper1hhrdiolfpu" />
    <!-- centralCaliforniaThe -->
    <span class="central-california-the">Central California — The person who grew these was located in Central California and, er, hopefully very well-compensated.</span>
    <!-- header -->
    <div class="header">
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
    <!-- stocksyTxp226f62b2ane300Medium -->
    <img class="stocksy-txp226f62b2ane300medium" :src="imgstocksy_txp226f62b2ane300_medium_4582193_1" alt="stocksyTxp226f62b2ane300Medium" />
  </div>
</template>

<script setup>
import imgjonathan_kemper_1hhrdiolfpu_unsplash_1 from './assets/jonathan-kemper-1hhrdiolfpu-unsplash-1.png'
import imgstocksy_txp226f62b2ane300_medium_4582193_1 from './assets/stocksy_txp226f62b2ane300_medium_4582193-1.png'
</script>

<style scoped>
.homepage {
  position: relative;
  max-width: 1440px;
  margin: 0 auto;
  height: 2092px;
  background-color: rgba(255, 255, 255, 1);
}

.were-farmers-purveyors {
  position: absolute;
  left: 217px;
  top: 279px;
  width: 1020px;
  height: 154px;
  font-family: 'Newsreader', sans-serif;
  font-size: 64px;
  font-weight: 400;
  line-height: 77px;
  letter-spacing: -1.28px;
  text-align: center;
  color: rgba(0, 0, 0, 1);
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 607px;
  top: 481px;
  width: 227px;
  height: 64px;
  overflow: hidden;
  background-color: rgba(66, 107, 31, 1);
  border-radius: 8px;
}

.browse-our-shop {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.we-believe-in {
  position: absolute;
  left: 309px;
  top: 1550px;
  width: 822px;
  height: 512px;
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 32px;
  text-align: left;
  color: rgba(0, 0, 0, 1);
}

.what-we-believe {
  position: absolute;
  left: 96px;
  top: 1555px;
  width: 181px;
  height: 22px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0.56px;
  text-align: left;
  white-space: nowrap;
  color: rgba(0, 0, 0, 1);
}

.jonathan-kemper1hhrdiolfpu {
  position: absolute;
  left: 96px;
  top: 701px;
  width: 504px;
  height: 693px;
  object-fit: cover;
  display: block;
}

.central-california-the {
  position: absolute;
  left: 660px;
  top: 1287px;
  width: 736px;
  height: 44px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  letter-spacing: -0.14px;
  text-align: left;
  color: rgba(0, 0, 0, 1);
}

.header {
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

.stocksy-txp226f62b2ane300medium {
  position: absolute;
  left: 660px;
  top: 791px;
  width: 780px;
  height: 480px;
  object-fit: cover;
  display: block;
}
</style>
