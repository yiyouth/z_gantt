<template>
  <div id="app">
    <ZGantt
      :datas="fakeDataOfMulti"
      multiField="jobSchedules"
      :isMultiRow="true"
    />
  </div>
</template>

<script>
import ZGantt from "./components/ganttChart/base.vue";
import {
  fakeDataOfMulti,
  fakeDataOfSingle,
} from "./components/ganttChart/fakeDate.js";
export default {
  name: "App",
  data() {
    return { fakeDataOfMulti, fakeDataOfSingle };
  },
  components: {
    ZGantt,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
