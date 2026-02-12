import React from 'react'
import styles from './Homepage.module.css'
import imgjonathan_kemper_1hhrdiolfpu_unsplash_1 from './assets/jonathan-kemper-1hhrdiolfpu-unsplash-1.png'
import imgstocksy_txp226f62b2ane300_medium_4582193_1 from './assets/stocksy_txp226f62b2ane300_medium_4582193-1.png'

export function Homepage(props) {
    return (
      <div className={styles['homepage']}>
        {/* wereFarmersPurveyors */}
      <span className={styles['were-farmers-purveyors']}>We’re farmers, purveyors, and eaters of organically grown food.</span>
      {/* button */}
      <div className={styles['button']}>
          {/* browseOurShop */}
        <span className={styles['browse-our-shop']}>Browse our shop</span>
        </div>
      {/* weBelieveIn */}
      <span className={styles['we-believe-in']}>We believe in produce. Tasty produce. Produce like:

      Apples. Oranges. Limes. Lemons. Guavas. Carrots. Cucumbers. Jicamas. Cauliflowers. Brussels sprouts. Shallots. Japanese eggplants. Asparagus. Artichokes—Jerusalem artichokes, too. Radishes. Broccoli. Baby broccoli. Broccolini. Bok choy. Scallions. Ginger. Cherries. Raspberries. Cilantro. Parsley. Dill. 

      What are we forgetting?

      Oh! Onions. Yams. Avocados. Lettuce. Arugula (to some, “rocket”). Persian cucumbers, in addition to aforementioned “normal” cucumbers. Artichokes. Zucchinis. Pumpkins. Squash (what some cultures call pumpkins). Sweet potatoes and potato-potatoes. Jackfruit. Monk fruit. Fruit of the Loom. Fruits of our labor (this website). Sorrel. Pineapple. Mango. Gooseberries. Blackberries. Tomatoes. Heirloom tomatoes. Beets. Chives. Corn. Endive. Escarole, which, we swear, we’re vendors of organic produce, but if you asked us to describe what escaroles are...</span>
      {/* whatWeBelieve */}
      <span className={styles['what-we-believe']}>WHAT WE BELIEVE</span>
      {/* jonathanKemper1hhrdiolfpu */}
      <img className={styles['jonathan-kemper1hhrdiolfpu']} src={imgjonathan_kemper_1hhrdiolfpu_unsplash_1} alt="jonathanKemper1hhrdiolfpu" />
      {/* centralCaliforniaThe */}
      <span className={styles['central-california-the']}>Central California — The person who grew these was located in Central California and, er, hopefully very well-compensated.</span>
      {/* header */}
      <div className={styles['header']}>
          {/* worldPeas */}
        <span className={styles['world-peas']}>World Peas</span>
        {/* shop */}
        <span className={styles['shop']}>Shop</span>
        {/* newstand */}
        <span className={styles['newstand']}>Newstand</span>
        {/* whoWeAre */}
        <span className={styles['who-we-are']}>Who we are</span>
        {/* myProfile */}
        <span className={styles['my-profile']}>My profile</span>
        {/* cartButton */}
        <div className={styles['cart-button']}>
            {/* basket3 */}
          <span className={styles['basket3']}>Basket (3)</span>
          </div>
        </div>
      {/* stocksyTxp226f62b2ane300Medium */}
      <img className={styles['stocksy-txp226f62b2ane300medium']} src={imgstocksy_txp226f62b2ane300_medium_4582193_1} alt="stocksyTxp226f62b2ane300Medium" />
      </div>
    )
  }
  