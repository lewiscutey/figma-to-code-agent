import React from 'react'
import styles from './ProductPage.module.css'
import imged_o_neil_avvdzlhdowa_unsplash_1 from './assets/ed-o-neil-avvdzlhdowa-unsplash-1.png'
import imgnoonbrew_zicb4_ekmak_unsplash from './assets/noonbrew-zicb4_ekmak-unsplash.png'

export function ProductPage(props) {
    return (
      <div className={styles['product-page']}>
        {/* pageHeading */}
      <div className={styles['page-heading']}>
          {/* defaultChip */}
        <div className={styles['default-chip']}>
            {/* default */}
          <span className={styles['default']}>Default</span>
          </div>
        {/* aZChip */}
        <div className={styles['a-zchip']}>
            {/* az */}
          <span className={styles['az']}>A-Z</span>
          </div>
        {/* listChip */}
        <div className={styles['list-chip']}>
            {/* listView */}
          <span className={styles['list-view']}>List view</span>
          </div>
        {/* freshAugust21 */}
        <span className={styles['fresh-august21']}>Fresh  —  August 21, 2023</span>
        {/* produce */}
        <span className={styles['produce']}>Produce</span>
        </div>
      {/* navigation */}
      <div className={styles['navigation']}>
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
      {/* tomato */}
      <div className={styles['tomato']}>
          {/* heirloomTomato */}
        <span className={styles['heirloom-tomato']}>Heirloom tomato</span>
        {/* 599Lb */}
        <span className={styles['lb']}>$5.99 / lb</span>
        {/* grownInSan */}
        <span className={styles['grown-in-san']}>Grown in San Juan Capistrano, CA</span>
        {/* edONeil */}
        <img className={styles['ed-oneil']} src={imged_o_neil_avvdzlhdowa_unsplash_1} alt="edONeil" />
        </div>
      {/* ginger */}
      <div className={styles['ginger']}>
          {/* organicGinger */}
        <span className={styles['organic-ginger']}>Organic ginger</span>
        {/* 1299Lb */}
        <span className={styles['lb-1']}>$12.99 / lb</span>
        {/* grownInHuntington */}
        <span className={styles['grown-in-huntington']}>Grown in Huntington Beach, CA</span>
        {/* noonbrewZicb4Ekmak */}
        <img className={styles['noonbrew-zicb4ekmak']} src={imgnoonbrew_zicb4_ekmak_unsplash} alt="noonbrewZicb4Ekmak" />
        </div>
      </div>
    )
  }
  