import React from 'react'
import styles from './Component.module.css'
import imgmars_methane_2 from './assets/mars-methane-2.png'
import imgmask_group from './assets/mask-group.png'
import imggroup_2608 from './assets/group-2608.png'
import imggroup from './assets/group.png'
import imggroup_10 from './assets/group-10.png'

export function Component(props) {
    const containerRef = React.useRef(null)
    const [scale, setScale] = React.useState(1)

    React.useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth
          setScale(Math.min(1, parentWidth / 1920))
        }
      }
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }, [])

    return (
      <div className={styles['responsive-wrapper']}>
        <div ref={containerRef} className={styles['scale-container']} style={{ transform: `scale(${scale})` }}>
          <div className={styles['element']}>
            {/* group2526 */}
          <div className={styles['group2526']}>
              {/* text */}
            <span className={styles['text']}>隐私</span>
            {/* miuiMiui12 */}
            <span className={styles['miui-miui12']}>MIUI不仅担当你生活中的得力助手，更为你的个人信息安全竭尽全力。
            在MIUI 12当中，你可以轻松管理你的隐私。来了解下吧。</span>
            {/* miui12 */}
            <span className={styles['miui12']}>MIUI 12
            为你提供的隐私安全工具
            比以往更强大</span>
            </div>
          {/* rectangle28 */}
          <div className={styles['rectangle28']} />
          {/* group2523 */}
          <div className={styles['group2523']}>
              {/* maskGroup */}
            <div className={styles['mask-group']}>
                {/* maskGroup */}
              <div className={styles['mask-group-1']}>
                  {/* marsMethane2 */}
                <img className={styles['mars-methane2']} src={imgmars_methane_2} alt="marsMethane2" />
                </div>
              {/* rectangle30 */}
              <div className={styles['rectangle30']} />
              </div>
            {/* text */}
            <span className={styles['text-1']}>触碰想象</span>
            {/* group2512 */}
            <div className={styles['group2512']}>
                {/* 01 */}
              <span className={styles['element-1']}>01</span>
              {/* rectangle38 */}
              <div className={styles['rectangle38']} />
              </div>
            </div>
          {/* group2527 */}
          <div className={styles['group2527']}>
              {/* text */}
            <span className={styles['text-2']}>感受真实</span>
            {/* group2512 */}
            <div className={styles['group2512-1']}>
                {/* 02 */}
              <span className={styles['element-2']}>02</span>
              {/* rectangle38 */}
              <div className={styles['rectangle38-1']} />
              </div>
            </div>
          {/* group2528 */}
          <div className={styles['group2528']}>
              {/* maskGroup */}
            <img className={styles['mask-group-2']} src={imgmask_group} alt="maskGroup" />
            {/* text */}
            <span className={styles['text-3']}>隐私保护</span>
            {/* group2512 */}
            <div className={styles['group2512-2']}>
                {/* 03 */}
              <span className={styles['element-3']}>03</span>
              {/* rectangle38 */}
              <div className={styles['rectangle38-2']} />
              </div>
            </div>
          {/* group2529 */}
          <div className={styles['group2529']}>
              {/* text */}
            <span className={styles['text-4']}>贴心功能</span>
            {/* group2512 */}
            <div className={styles['group2512-3']}>
                {/* 04 */}
              <span className={styles['element-4']}>04</span>
              {/* rectangle38 */}
              <div className={styles['rectangle38-3']} />
              </div>
            </div>
          {/* group2530 */}
          <div className={styles['group2530']}>
              {/* text */}
            <span className={styles['text-5']}>发布计划</span>
            {/* group2512 */}
            <div className={styles['group2512-4']}>
                {/* 05 */}
              <span className={styles['element-5']}>05</span>
              {/* rectangle38 */}
              <div className={styles['rectangle38-4']} />
              </div>
            </div>
          {/* group2608 */}
          <img className={styles['group2608']} src={imggroup_2608} alt="group2608" />
          {/* group2524 */}
          <div className={styles['group2524']}>
              {/* rectangle44 */}
            <div className={styles['rectangle44']} />
            {/* group */}
            <img className={styles['group']} src={imggroup} alt="group" />
            {/* group9 */}
            <div className={styles['group9']}>
                {/* text */}
              <span className={styles['text-6']}>首页</span>
              {/* text */}
              <span className={styles['text-7']}>隐私</span>
              {/* text */}
              <span className={styles['text-8']}>无障碍</span>
              {/* text */}
              <span className={styles['text-9']}>小米商城</span>
              {/* text */}
              <span className={styles['text-10']}>云服务</span>
              {/* text */}
              <span className={styles['text-11']}>小米社区</span>
              </div>
            {/* group10 */}
            <img className={styles['group10']} src={imggroup_10} alt="group10" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  