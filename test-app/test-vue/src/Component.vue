<template>
  <div class="responsive-wrapper">
    <div ref="scaleRef" class="scale-container" :style="{ transform: `scale(${scale})` }">
      <div class="element">
        <!-- group2526 -->
        <div class="group2526">
          <!-- text -->
          <span class="text">隐私</span>
          <!-- miuiMiui12 -->
          <span class="miui-miui12">MIUI不仅担当你生活中的得力助手，更为你的个人信息安全竭尽全力。
          在MIUI 12当中，你可以轻松管理你的隐私。来了解下吧。</span>
          <!-- miui12 -->
          <span class="miui12">MIUI 12
          为你提供的隐私安全工具
          比以往更强大</span>
        </div>
        <!-- rectangle28 -->
        <div class="rectangle28" />
        <!-- group2523 -->
        <div class="group2523">
          <!-- maskGroup -->
          <div class="mask-group">
            <!-- maskGroup -->
            <div class="mask-group-1">
              <!-- marsMethane2 -->
              <img class="mars-methane2" :src="imgmars_methane_2" alt="marsMethane2" />
            </div>
            <!-- rectangle30 -->
            <div class="rectangle30" />
          </div>
          <!-- text -->
          <span class="text-1">触碰想象</span>
          <!-- group2512 -->
          <div class="group2512">
            <!-- 01 -->
            <span class="element-1">01</span>
            <!-- rectangle38 -->
            <div class="rectangle38" />
          </div>
        </div>
        <!-- group2527 -->
        <div class="group2527">
          <!-- text -->
          <span class="text-2">感受真实</span>
          <!-- group2512 -->
          <div class="group2512-1">
            <!-- 02 -->
            <span class="element-2">02</span>
            <!-- rectangle38 -->
            <div class="rectangle38-1" />
          </div>
        </div>
        <!-- group2528 -->
        <div class="group2528">
          <!-- maskGroup -->
          <img class="mask-group-2" :src="imgmask_group" alt="maskGroup" />
          <!-- text -->
          <span class="text-3">隐私保护</span>
          <!-- group2512 -->
          <div class="group2512-2">
            <!-- 03 -->
            <span class="element-3">03</span>
            <!-- rectangle38 -->
            <div class="rectangle38-2" />
          </div>
        </div>
        <!-- group2529 -->
        <div class="group2529">
          <!-- text -->
          <span class="text-4">贴心功能</span>
          <!-- group2512 -->
          <div class="group2512-3">
            <!-- 04 -->
            <span class="element-4">04</span>
            <!-- rectangle38 -->
            <div class="rectangle38-3" />
          </div>
        </div>
        <!-- group2530 -->
        <div class="group2530">
          <!-- text -->
          <span class="text-5">发布计划</span>
          <!-- group2512 -->
          <div class="group2512-4">
            <!-- 05 -->
            <span class="element-5">05</span>
            <!-- rectangle38 -->
            <div class="rectangle38-4" />
          </div>
        </div>
        <!-- group2608 -->
        <img class="group2608" :src="imggroup_2608" alt="group2608" />
        <!-- group2524 -->
        <div class="group2524">
          <!-- rectangle44 -->
          <div class="rectangle44" />
          <!-- group -->
          <img class="group" :src="imggroup" alt="group" />
          <!-- group9 -->
          <div class="group9">
            <!-- text -->
            <span class="text-6">首页</span>
            <!-- text -->
            <span class="text-7">隐私</span>
            <!-- text -->
            <span class="text-8">无障碍</span>
            <!-- text -->
            <span class="text-9">小米商城</span>
            <!-- text -->
            <span class="text-10">云服务</span>
            <!-- text -->
            <span class="text-11">小米社区</span>
          </div>
          <!-- group10 -->
          <img class="group10" :src="imggroup_10" alt="group10" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import imgmars_methane_2 from './assets/mars-methane-2.png'
import imgmask_group from './assets/mask-group.png'
import imggroup_2608 from './assets/group-2608.png'
import imggroup from './assets/group.png'
import imggroup_10 from './assets/group-10.png'

const scaleRef = ref(null)
const scale = ref(1)

const updateScale = () => {
  if (scaleRef.value) {
    const parentWidth = scaleRef.value.parentElement?.clientWidth || window.innerWidth
    scale.value = Math.min(1, parentWidth / 1920)
  }
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})
</script>

<style scoped>
.responsive-wrapper {
  width: 100%;
  overflow: hidden;
}

.scale-container {
  width: 1920px;
  height: 1080px;
  transform-origin: top left;
}

.element {
  position: relative;
  background-color: rgba(0, 0, 0, 1);
}

.group2526 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.text {
  position: absolute;
  left: 385px;
  top: 280px;
  width: 360px;
  height: 239px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 180px;
  font-weight: 300;
  line-height: 239px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.miui-miui12 {
  position: absolute;
  left: 396px;
  top: 788px;
  width: 700px;
  height: 58px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 22px;
  font-weight: 400;
  line-height: 29px;
  text-align: justified;
  color: rgba(255, 255, 255, 0.699999988079071);
}

.miui12 {
  position: absolute;
  left: 396px;
  top: 643px;
  width: 416px;
  height: 129px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 36px;
  font-weight: 700;
  line-height: 43px;
  letter-spacing: 2px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.rectangle28 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 1920px;
  height: 1080px;
  background-color: rgba(0, 0, 0, 0.4000000059604645);
}

.group2523 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.mask-group {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.mask-group-1 {
  position: absolute;
  left: 50px;
  top: 425px;
  width: 597px;
  height: 597px;
  overflow: hidden;
  background-color: inherit;
}

.mars-methane2 {
  position: absolute;
  left: -202px;
  top: -22px;
  width: 969px;
  height: 640px;
  object-fit: cover;
  display: block;
}

.rectangle30 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 384px;
  height: 1080px;
  background-color: rgba(0, 0, 0, 0.30000001192092896);
}

.text-1 {
  position: absolute;
  left: 70px;
  top: 250px;
  width: 104px;
  height: 440px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 100px;
  font-weight: 300;
  line-height: 110px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.group2512 {
  position: absolute;
  left: 70px;
  top: 946px;
  width: 26px;
  height: 46px;
  overflow: hidden;
  background-color: inherit;
}

.element-1 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 26px;
  height: 34px;
  font-family: 'Mitype', sans-serif;
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.rectangle38 {
  position: absolute;
  left: 2px;
  top: 44px;
  width: 14px;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
}

.group2527 {
  position: absolute;
  left: 384px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.text-2 {
  position: absolute;
  left: 70px;
  top: 250px;
  width: 104px;
  height: 440px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 100px;
  font-weight: 300;
  line-height: 110px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.group2512-1 {
  position: absolute;
  left: 70px;
  top: 946px;
  width: 30px;
  height: 46px;
  overflow: hidden;
  background-color: inherit;
}

.element-2 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 30px;
  height: 34px;
  opacity: 0.5;
  font-family: 'Mitype', sans-serif;
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.rectangle38-1 {
  position: absolute;
  left: 2px;
  top: 44px;
  width: 14px;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
  opacity: 0.4000000059604645;
}

.group2528 {
  position: absolute;
  left: 768px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.mask-group-2 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 384px;
  height: 1080px;
  object-fit: cover;
  display: block;
}

.text-3 {
  position: absolute;
  left: 70px;
  top: 250px;
  width: 104px;
  height: 440px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 100px;
  font-weight: 300;
  line-height: 110px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.group2512-2 {
  position: absolute;
  left: 70px;
  top: 946px;
  width: 30px;
  height: 46px;
  overflow: hidden;
  background-color: inherit;
}

.element-3 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 30px;
  height: 34px;
  font-family: 'Mitype', sans-serif;
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.rectangle38-2 {
  position: absolute;
  left: 2px;
  top: 44px;
  width: 14px;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
}

.group2529 {
  position: absolute;
  left: 1152px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.text-4 {
  position: absolute;
  left: 70px;
  top: 250px;
  width: 104px;
  height: 440px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 100px;
  font-weight: 300;
  line-height: 110px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.group2512-3 {
  position: absolute;
  left: 70px;
  top: 946px;
  width: 31px;
  height: 46px;
  overflow: hidden;
  background-color: inherit;
}

.element-4 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 31px;
  height: 34px;
  opacity: 0.5;
  font-family: 'Mitype', sans-serif;
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.rectangle38-3 {
  position: absolute;
  left: 2px;
  top: 44px;
  width: 14px;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
  opacity: 0.4000000059604645;
}

.group2530 {
  position: absolute;
  left: 1536px;
  top: 0px;
  width: 384px;
  height: 1080px;
  overflow: hidden;
  background-color: inherit;
}

.text-5 {
  position: absolute;
  left: 70px;
  top: 250px;
  width: 104px;
  height: 440px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 100px;
  font-weight: 300;
  line-height: 110px;
  text-align: left;
  color: rgba(255, 255, 255, 1);
}

.group2512-4 {
  position: absolute;
  left: 70px;
  top: 946px;
  width: 30px;
  height: 46px;
  overflow: hidden;
  background-color: inherit;
}

.element-5 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 30px;
  height: 34px;
  opacity: 0.5;
  font-family: 'Mitype', sans-serif;
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.rectangle38-4 {
  position: absolute;
  left: 2px;
  top: 44px;
  width: 14px;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
  opacity: 0.4000000059604645;
}

.group2608 {
  position: absolute;
  left: 384px;
  top: 0px;
  width: 1153px;
  height: 1080px;
  object-fit: cover;
  display: block;
}

.group2524 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 1920px;
  height: 170px;
  overflow: hidden;
  background-color: inherit;
}

.rectangle44 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 1920px;
  height: 170px;
  background-color: rgba(0, 0, 0, 1);
}

.group {
  position: absolute;
  left: 396px;
  top: 80px;
  width: 70px;
  height: 16px;
  object-fit: cover;
  display: block;
}

.group9 {
  position: absolute;
  left: 940px;
  top: 75px;
  width: 488px;
  height: 21px;
  overflow: hidden;
  background-color: inherit;
}

.text-6 {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 32px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.text-7 {
  position: absolute;
  left: 72px;
  top: 0px;
  width: 32px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.text-8 {
  position: absolute;
  left: 144px;
  top: 0px;
  width: 48px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: left;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.text-9 {
  position: absolute;
  left: 424px;
  top: 0px;
  width: 64px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.text-10 {
  position: absolute;
  left: 336px;
  top: 0px;
  width: 48px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.text-11 {
  position: absolute;
  left: 232px;
  top: 0px;
  width: 64px;
  height: 21px;
  font-family: 'MI Lan Pro', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  text-align: right;
  white-space: nowrap;
  color: rgba(255, 255, 255, 1);
}

.group10 {
  position: absolute;
  left: 1504px;
  top: 76px;
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}
</style>
