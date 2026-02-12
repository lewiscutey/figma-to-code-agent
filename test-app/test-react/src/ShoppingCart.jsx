import React from 'react'
import styles from './ShoppingCart.module.css'
import imged_o_neil_avvdzlhdowa_unsplash_1 from './assets/ed-o-neil-avvdzlhdowa-unsplash-1.png'
import imgnoonbrew_zicb4_ekmak_unsplash from './assets/noonbrew-zicb4_ekmak-unsplash.png'
import imgk8_0_fkphulv_m_unsplash_2 from './assets/k8-0_fkphulv-m-unsplash-2.png'

export function ShoppingCart(props) {
    return (
      <div className={styles['shopping-cart']}>
        {/* tomato */}
      <div className={styles['tomato']}>
          {/* heirloomTomato */}
        <span className={styles['heirloom-tomato']}>Heirloom tomato</span>
        {/* 599 */}
        <span className={styles['element']}>$5.99</span>
        {/* 599Lb */}
        <span className={styles['lb']}>$5.99 / lb</span>
        {/* inputField */}
        <div className={styles['input-field']}>
            {/* 1Lb */}
          <span className={styles['lb-1']}>1 lb</span>
          {/* icon */}
          <div className={styles['icon']}>
              {/* union */}
            <div className={styles['union']}>
                {/* union */}
              <div className={styles['union-1']}>
                  {/* rectangle4 */}
                <div className={styles['rectangle4']} />
                {/* rectangle5 */}
                <div className={styles['rectangle5']} />
                </div>
              </div>
            </div>
          </div>
        {/* edONeil */}
        <img className={styles['ed-oneil']} src={imged_o_neil_avvdzlhdowa_unsplash_1} alt="edONeil" />
        </div>
      {/* ginger */}
      <div className={styles['ginger']}>
          {/* organicGinger */}
        <span className={styles['organic-ginger']}>Organic ginger</span>
        {/* 1299Lb */}
        <span className={styles['lb-2']}>$12.99 / lb</span>
        {/* inputField */}
        <div className={styles['input-field-1']}>
            {/* 05Lb */}
          <span className={styles['lb-3']}>0.5 lb</span>
          {/* icon */}
          <div className={styles['icon-1']}>
              {/* union */}
            <div className={styles['union-2']}>
                {/* union */}
              <div className={styles['union-3']}>
                  {/* rectangle4 */}
                <div className={styles['rectangle4-1']} />
                {/* rectangle5 */}
                <div className={styles['rectangle5-1']} />
                </div>
              </div>
            </div>
          </div>
        {/* 650 */}
        <span className={styles['element-1']}>$6.50</span>
        {/* noonbrewZicb4Ekmak */}
        <img className={styles['noonbrew-zicb4ekmak']} src={imgnoonbrew_zicb4_ekmak_unsplash} alt="noonbrewZicb4Ekmak" />
        </div>
      {/* onion */}
      <div className={styles['onion']}>
          {/* sweetOnion */}
        <span className={styles['sweet-onion']}>Sweet onion</span>
        {/* 299Lb */}
        <span className={styles['lb-4']}>$2.99 / lb</span>
        {/* inputField */}
        <div className={styles['input-field-2']}>
            {/* 5Lb */}
          <span className={styles['lb-5']}>5 lb</span>
          {/* icon */}
          <div className={styles['icon-2']}>
              {/* union */}
            <div className={styles['union-4']}>
                {/* union */}
              <div className={styles['union-5']}>
                  {/* rectangle4 */}
                <div className={styles['rectangle4-2']} />
                {/* rectangle5 */}
                <div className={styles['rectangle5-2']} />
                </div>
              </div>
            </div>
          </div>
        {/* 1495 */}
        <span className={styles['element-2']}>$14.95</span>
        {/* k80Fkphulv */}
        <img className={styles['k80fkphulv']} src={imgk8_0_fkphulv_m_unsplash_2} alt="k80Fkphulv" />
        </div>
      {/* summary */}
      <div className={styles['summary']}>
          {/* orderSummary */}
        <span className={styles['order-summary']}>Order summary</span>
        {/* subtotal */}
        <span className={styles['subtotal']}>Subtotal</span>
        {/* 2744 */}
        <span className={styles['element-3']}>$27.44</span>
        {/* shipping */}
        <span className={styles['shipping']}>Shipping</span>
        {/* 399 */}
        <span className={styles['element-4']}>$3.99</span>
        {/* tax */}
        <span className={styles['tax']}>Tax</span>
        {/* 200 */}
        <span className={styles['element-5']}>$2.00</span>
        {/* total */}
        <span className={styles['total']}>Total</span>
        {/* 3343 */}
        <span className={styles['element-6']}>$33.43</span>
        {/* button */}
        <div className={styles['button']}>
            {/* continueToPayment */}
          <span className={styles['continue-to-payment']}>Continue to payment</span>
          </div>
        </div>
      {/* pageHeading */}
      <div className={styles['page-heading']}>
          {/* 3Items */}
        <span className={styles['items']}>3 items</span>
        {/* basket */}
        <span className={styles['basket']}>Basket</span>
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
      </div>
    )
  }
  