<template>
  <div class="gantt_container">
    <div class="gantt_tools">
      <span class="gantt_tool">
        <label class="gantt_tool_label">吸附至最近时间刻度:</label>
        <input type="checkbox" v-model="isMagnetEnabled" />
      </span>
      <span class="gantt_tool">
        <label class="gantt_tool_label">可拖拽至其他行:</label>
        <input type="checkbox" v-model="isMoveYEnabled" :enabled="isMultiRow" />
      </span>
      <span class="gantt_tool">
        <label class="gantt_tool_label">时间间隔:</label>
        <input type="radio" name="timeType" :value="0" v-model="timeType" />
        <span>时</span>
        <input type="radio" name="timeType" :value="1" v-model="timeType" />
        <span>天</span>
      </span>
      <span class="gantt_tool">
        <label class="gantt_tool_label">绑定模式:</label>
        <input
          type="radio"
          name="rowBindType"
          :value="0"
          v-model="rowBindType"
        />
        <span>同时开始</span>
        <input
          type="radio"
          name="rowBindType"
          :value="1"
          v-model="rowBindType"
        />
        <span>同时结束</span>
        <input
          type="radio"
          name="rowBindType"
          :value="2"
          v-model="rowBindType"
        />
        <span>前结束后开始</span>
      </span>
      <span class="gantt_tool">
        <label class="gantt_tool_label">起始时间:</label>
        <Calendar model="timeTickStart" @change="onLabelTickStartChange" />
      </span>
      <span class="gantt_tool">
        <label class="gantt_tool_label">结束时间:</label>
        <Calendar model="timeTickEnd" @change="onLabelTickEndChange" />
      </span>
      <span class="gantt_tool" @click="refresh()"
        ><Btn name="刷新甘特图"
      /></span>
      <span class="gantt_tool" @click="onSave"><Btn name="保存" /></span>
    </div>
    <div class="gantt_data_container">
      <div class="gantt_tick_container" ref="gantt_tick_container">
        <div class="gantt_columns">
          <div
            v-for="(column, index) in columns"
            :key="index"
            class="tick_unit tick_column"
            :style="{ width: `${ganttGridUnitWidth}px` }"
          >
            {{ column.label }}
          </div>
        </div>
        <div class="gantt_ticks">
          <div
            v-for="(timeTick, index) in timeTicks"
            :key="index"
            class="tick_unit"
            :style="{ width: `${tickUnitWidth}px` }"
          >
            <div class="tick_unit_date">{{ timeTick.dateStr }}</div>
            <div class="tick_unit_time" v-show="timeType === 0">
              {{ timeTick.timeStr }}
            </div>
          </div>
        </div>
      </div>
      <div class="gantt_data_wrapper">
        <div
          class="gantt_row_container"
          @mousedown="onContainerMouseDown($event)"
          @mouseover="onContainerMouseOver($event)"
          @mouseout="onContainerMouseLeave($event)"
        >
          <div
            v-for="(ganttDataArr, index) in ganttDatas"
            :key="index"
            class="gantt_row"
            :style="{
              height: `${(multiField ? ganttDataArr.length : 1) * 32}px`,
            }"
          >
            <div
              v-for="(column, columnIndex) in columns"
              :key="columnIndex"
              class="gantt_name"
              :style="{
                width: `${ganttGridUnitWidth}px`,
                left: `${columnIndex * ganttGridUnitWidth}px`,
              }"
            ></div>
            <div
              class="gantt_content"
              :ref="`gantt_content_${index}`"
              :data-index="index"
              :style="{ width: `${timeTicks.length * 120 + 16}px` }"
            >
              <div
                :class="[
                  'gantt_unit',
                  ganttData._gantt_moved ? 'moved' : '',
                  ganttData.isRelated ? 'related' : '',
                ]"
                :style="ganttData._gantt_unitStyle"
                v-for="(ganttData, index1) in ganttDataArr"
                :key="index1"
                :data-index="ganttData._gantt_index"
              >
                <div
                  :class="[
                    'gantt_sign',
                    ganttData._gantt_width ? 'left_sign' : '',
                  ]"
                  :style="ganttData._gantt_leftSignStyle"
                />
                <div
                  :class="['gantt_slider', ganttData.isHover ? 'isHover' : '']"
                  :style="ganttData._gantt_style"
                  :ref="`gantt_slider_${index}`"
                />
                <div
                  :class="[
                    'gantt_sign',
                    ganttData._gantt_width ? 'right_sign' : '',
                  ]"
                  :style="ganttData._gantt_rightSignStyle"
                />
                <div
                  class="gantt_unit_text"
                  v-if="ganttData.source[ganttTextField]"
                >
                  {{ ganttData.source[ganttTextField] }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * ganttDatas为每一条数据组成的数组,
 *  * isMultiRow为false时，每一条主行(mainRow)对应一条数据   (不支持数据行进行跨行拖拽)
 *  * isMultiRow为true 时，每一条主行(mainRow)可对应多条数据 (可支持数据行进行跨行拖拽)
 */

// 标识前后序， 调整后，改变颜色， 根据参数，调整前后序任务的时间
import {
  getTimeTicks,
  Message,
  getSecondsBetweenTwoTimes,
  isNullOrEmpty,
  getTimeDiffBetweenTwoTime,
} from "../../assets/utils/util";
import BaseUtil from "../../assets/utils/BaseUtil";
import { fakeDataOfMulti } from "./fakeDate";
const { sub } = BaseUtil.Number;
// import DateTime from "./components/DateTime.vue";
export default {
  components: {},
  props: {
    datas: {
      type: Array,
      default: function () {
        return fakeDataOfMulti;
      },
    },

    isMultiRow: {
      type: Boolean,
      default() {
        return true;
      },
    },
    // 一行data中存在多行row的情况下， rows在data中的key
    multiField: {
      type: String,
      default() {
        return "jobSchedules";
      },
    },
    // row的前序与后续字段绑定的key, 默认前序与后序字段绑定为对应row的id:
    connectField: {
      type: String,
      default() {
        return "id";
      },
    },
    connectObj: {
      type: Object,
      default() {
        return {
          Job: { nexts: ["Job-next-1"], prevs: ["Job-prev-1"] },
          "Job-next-1": { nexts: ["Job-next-1-1"] },
          "Job-prev-1": { prevs: ["Job-prev-1-1"], nexts: ["Job"] },
        };
      },
    },
    ganttTextField: {
      type: String,
      default() {
        return "code";
      },
    },
    timeStartField: {
      type: String,
      default: function () {
        return "timeStart";
      },
    },
    timeEndField: {
      type: String,
      default: function () {
        return "timeEnd";
      },
    },
    isRelateEnabled: {
      type: Boolean,
      default: function () {
        return true;
      },
    },
    relateKeys: {
      type: Array,
      default: function () {
        return [];
      },
    },
    errPer: {
      type: Number,
      default: function () {
        return 0.5;
      },
    },
  },
  watch: {
    datas: function (datas) {
      this.initDatas(datas);
    },
  },
  computed: {
    //  一秒代表多少像素
    secondPerHour: (vm) => {
      switch (vm.timeType) {
        case 0: {
          return vm.tickUnitWidth / 3600;
        }
        case 1: {
          return vm.tickUnitWidth / (3600 * 24);
        }
      }
    },
    // 一像素代表多少秒
    secondPerPx: (vm) => {
      switch (vm.timeType) {
        case 0: {
          return (1 * 3600) / vm.tickUnitWidth;
        }
        case 1: {
          return (1 * 3600 * 24) / vm.tickUnitWidth;
        }
      }
    },
    // 一个单元格代表多少秒
    unitINRToSeconds: (vm) => vm.secondPerPx * vm.tickUnitWidth,
    ganttDataObj: (vm) => {
      const ganttDatas = vm.ganttDatas;
      const ganttDataObj = {};
      if (ganttDatas && ganttDatas.length) {
        ganttDatas.forEach((dataArr, indexArr) => {
          dataArr.forEach((data, index) => {
            const mergedIndex = `${indexArr}/${index}`;
            ganttDataObj[mergedIndex] = {
              data,
              parentArr: dataArr,
              indexInParentArr: index,
            };
          });
        });
      }
      return ganttDataObj;
    },
  },
  data() {
    return {
      ganttDatas: [],
      isMagnetEnabled: true, // 是否使用吸附
      timeType: 0, // 时间间隔的类型
      rowBindType: 0, // 绑定的类型
      isMoveYEnabled: true,

      timeTicks: [],
      timeTickStart: null,
      timeTickEnd: null,
      tickUnitWidth: 120,
      selectedIndex: null,

      movedSliderElement: null, // 正在移动的slider的元素
      lastMouseX: null, // 记录鼠标上一次在X轴上的位置
      lastMouseY: null, // 记录鼠标上一次在Y轴上的位置
      isSliderMove: false, // 滑块slider是否在移动
      isSignMove: false, // sign是否在移动
      signType: null,

      ganttGridUnitWidth: 160,
    };
  },
  created() {
    window.asd = this;
    this.initDatas(this.datas);
    this.refresh();
  },
  methods: {
    onFocus(event) {
      window.console.log("focus", event);
    },
    onBlur(event) {
      window.console.log("blur", event);
    },
    onLabelTickStartChange(timeTickStart) {
      this.refresh(timeTickStart);
    },
    onLabelTickEndChange(timeTickEnd) {
      this.refresh(null, timeTickEnd);
    },
    /**
     * 监听slider与sign的祖父容器gantt_row_container的鼠标按下事件
     */
    onContainerMouseDown(event) {
      let eventType;
      const eleClassName = event.srcElement.className;
      if (typeof eleClassName === "string") {
        if (eleClassName.search(/\bgantt_slider\b/) !== -1) {
          eventType = 0;
        } else if (eleClassName.search(/\bgantt_unit_text\b/) !== -1) {
          eventType = 0;
        } else if (eleClassName.search(/\bleft_sign\b/) !== -1) {
          eventType = 1;
        } else if (eleClassName.search(/\bright_sign\b/) !== -1) {
          eventType = 2;
        } else if (eleClassName.search(/\bgantt_sign\b/) !== -1) {
          eventType = 2;
        }
      }
      if (eventType !== undefined) {
        this.selectedIndex = event.target.parentElement.dataset.index;
        const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);

        this.setGanttDataHover(ganttData, true);
        window.addEventListener("mousemove", this.onGanttMouseMove);
        window.addEventListener("mouseup", this.onGanttMouseUp);
        switch (eventType) {
          case 0: {
            this.onSliderMouseDown(event);
            break;
          }
          case 1: {
            this.onSignMouseDown(event, 0);
            break;
          }
          case 2: {
            this.onSignMouseDown(event, 1);
            break;
          }
        }
      }
    },
    onContainerMouseOver(event) {
      if (!isNullOrEmpty(this.selectedIndex)) {
        return;
      }
      const eleClassName = event.srcElement.className;
      if (
        typeof eleClassName === "string" &&
        eleClassName.search(
          /(\bgantt_slider\b)|(\bgantt_unit_text\b)|(\bgantt_sign\b)/
        ) !== -1
      ) {
        const index = event.srcElement.parentElement.dataset.index;
        const ganttData = this.getGanttDataByGanttIndex(index);
        this.setGanttDataHover(ganttData, true);
      }
    },
    onContainerMouseLeave(event) {
      if (!isNullOrEmpty(this.selectedIndex)) {
        return;
      }
      const fromElement = event.fromElement;
      const toElement = event.toElement;
      const fromClassName = fromElement && fromElement.className;
      const toClassName = toElement && toElement.className;
      if (
        typeof fromClassName === "string" &&
        fromClassName.search(
          /(\bgantt_slider\b)|(\bgantt_unit_text\b)|(\bgantt_sign\b)/
        ) !== -1
      ) {
        const index = fromElement.parentElement.dataset.index;
        const ganttData = this.getGanttDataByGanttIndex(index);
        if (
          ganttData.isHover &&
          ganttData._gantt_index !== this.selectedIndex
        ) {
          this.setGanttDataHover(ganttData, false);
        }
      }
      if (
        typeof toClassName === "string" &&
        toClassName.search(
          /(\bgantt_slider\b)|(\bgantt_unit_text\b)|(\bgantt_sign\b)/
        ) !== -1
      ) {
        const index = toElement.parentElement.dataset.index;
        const ganttData = this.getGanttDataByGanttIndex(index);
        this.setGanttDataHover(ganttData, true);
      }
    },
    /**
     * 监听slider的鼠标按下事件
     */
    onSliderMouseDown(event) {
      this.isSliderMove = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      let srcElement = event.srcElement;
      while (
        srcElement &&
        srcElement.className.search(/\bgantt_unit\b/) === -1
      ) {
        srcElement = srcElement.parentElement;
      }
      srcElement && (this.movedSliderElement = srcElement);
    },
    /**
     * 监听slider的鼠标按下-弹起之间鼠标移动事件
     */
    onSliderMouseMove(event) {
      if (this.isSliderMove) {
        const intervalX = sub(event.clientX, this.lastMouseX);
        const intervalY = this.isMoveYEnabled
          ? sub(event.clientY, this.lastMouseY)
          : 0;
        const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
        this.moveSliderByInterval(ganttData, intervalX, intervalY);
        this.lastMouseX = event.clientX; // 更新鼠标在X轴的位置
        this.lastMouseY = event.clientY; // 更新鼠标在Y轴的位置
        this.syncConnectedGanttData([ganttData]);
      }
    },
    /**
     * 监听slider的鼠标弹起事件
     */
    onSliderMouseUp(event) {
      this.isSliderMove = false;
      const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
      const timeStartDiff = getTimeDiffBetweenTwoTime(
        this.timeTickStart,
        ganttData._gantt_timeStart
      );
      const timeEndDiff = getTimeDiffBetweenTwoTime(
        this.timeTickEnd,
        ganttData._gantt_timeEnd
      );

      if (timeStartDiff > 0) {
        this.moveSliderByTimeDiff(ganttData, timeStartDiff, false);
      } else if (timeEndDiff < 0) {
        this.moveSliderByTimeDiff(ganttData, timeEndDiff, false);
      } else {
        const magneticTime = this.getMagneticTime(ganttData._gantt_timeStart);
        if (magneticTime) {
          this.moveSliderByTimeDiff(
            ganttData,
            getTimeDiffBetweenTwoTime(magneticTime, ganttData._gantt_timeStart),
            false
          );
        }
      }
      let tarRowElement;
      for (const ele of event.path) {
        if (ele.className && ele.className.search(/\bgantt_content\b/) !== -1) {
          tarRowElement = ele;
          break;
        }
      }
      if (
        this.isMoveYEnabled &&
        this.movedSliderElement &&
        tarRowElement &&
        this.movedSliderElement.parentElement !== tarRowElement
      ) {
        this.moveSliderToNewRow(ganttData, tarRowElement.dataset.index);
      }

      this.moveSliderByInterval(
        ganttData,
        0,
        -ganttData._gantt_translateY,
        false
      );
      this.setStyleFieldByGanttData(ganttData);
      this.syncConnectedGanttData([ganttData]);
      // this.refresh();
    },

    /**
     * 监听sign的鼠标按下事件
     * @param {Number} signType sign的type, 0为左边的sign, 1为右边的sign
     */
    onSignMouseDown(event, signType) {
      this.signType = signType;
      this.isSignMove = true;
      this.lastMouseX = event.clientX;
    },
    /**
     * 监听sign的鼠标按下，弹起之间鼠标移动事件
     */
    onSignMouseMove(event) {
      if (this.isSignMove) {
        const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
        const clientX = event.clientX;
        const interval = clientX - this.lastMouseX;
        const res = this.addSliderWidthByInterval(
          ganttData,
          interval,
          this.signType
        );
        if (res !== false) {
          this.lastMouseX = clientX;
        } else {
          this.isSignMove = false;
          this.signType = null;
        }
        this.syncConnectedGanttData([ganttData]);
      }
    },
    /**
     * 监听sign的鼠标弹起事件
     */
    onSignMouseUp() {
      if (!this.isSignMove) {
        return;
      }
      const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
      switch (this.signType) {
        // 左边的sign
        case 0: {
          const magneticTime = this.getMagneticTime(ganttData._gantt_timeStart);
          if (magneticTime) {
            const timeDiff = getTimeDiffBetweenTwoTime(
              magneticTime,
              ganttData._gantt_timeStart
            );
            this.addSliderWidthByTimeDiff(ganttData, timeDiff, 0);
          }
          break;
        }
        // 默认为右边的sign
        default: {
          const magneticTime = this.getMagneticTime(ganttData._gantt_timeEnd);
          if (magneticTime) {
            const timeDiff = getTimeDiffBetweenTwoTime(
              magneticTime,
              ganttData._gantt_timeEnd
            );
            this.addSliderWidthByTimeDiff(ganttData, timeDiff, 1);
          }
        }
      }
      this.syncConnectedGanttData([ganttData]);
      this.isSignMove = false;
      this.signType = null;
    },
    /**
     * 保存时，将滑块的起止时间赋值给源数据
     */
    onSave() {
      for (const ganttDataArr of this.ganttDatas) {
        for (const ganttData of ganttDataArr) {
          this.$set(
            ganttData.source,
            this.timeStartField,
            ganttData["_gantt_timeStart"]
          );
          this.$set(
            ganttData.source,
            this.timeEndField,
            ganttData["_gantt_timeEnd"]
          );
        }
      }
      if (this.isMultiRow && this.multiField) {
        for (let index = 0; index < this.datas.length; index++) {
          this.$set(
            this.datas[index],
            this.multiField,
            this.ganttDatas[index].map((ganttData) => ganttData.source)
          );
        }
      }
      this.refresh();
    },
    /**
     * 刷新函数
     */
    refresh(startTick = null, endTick = null) {
      let timeStartTick, timeEndTick;
      // 根据ganttDatas的数据，获取最早的timeStart以及最晚的timeEnd，用来设置可滚动区域的起止时间
      for (const ganttDataArr of this.ganttDatas) {
        for (const ganttData of ganttDataArr) {
          const startTime = (
            ganttData["_gantt_timeStart"] ||
            (ganttData[this.timeStartField]
              ? new Date(ganttData[this.timeStartField])
              : new Date())
          ).getTime();
          const endTime = (
            ganttData["_gantt_timeEnd"] ||
            (ganttData[this.timeEndField]
              ? new Date(ganttData[this.timeEndField])
              : new Date())
          ).getTime();
          if (!(timeStartTick < startTime)) {
            timeStartTick = startTime;
          }
          if (!(timeEndTick > endTime)) {
            timeEndTick = endTime;
          }
        }
      }
      startTick = startTick || new Date(timeStartTick);
      endTick = endTick || new Date(timeEndTick);
      this.timeTicks = getTimeTicks(startTick, endTick, this.timeType);
      this.timeTickStart = this.timeTicks[0];
      this.timeTickEnd = new Date(this.timeTicks.slice(-1)[0].timeEnd);

      // 根据ganttData的数据，设置对应进度条的样式
      this.ganttDatas.forEach((ganttDataArr) => {
        ganttDataArr.forEach(this.setStyleFieldByGanttData);
      });
    },
    onDateTimeChange(data, field, newValue, oldValue) {
      switch (field) {
        case "_gantt_timeStart": {
          if (newValue.getTime() > data["_gantt_timeEnd"].getTime()) {
            Message.error(`开始时间不可迟于结束时间`);
            data[field] = oldValue;
            return;
          }
          if (newValue.getTime() < this.timeTicks[0].time) {
            this.refresh();
          } else {
            this.setStyleFieldByGanttData(data);
          }
          break;
        }
        case "_gantt_timeEnd": {
          if (newValue.getTime() < data["_gantt_timeStart"].getTime()) {
            Message.error(`结束时间不可早于开始时间`);
            data[field] = oldValue;
            return;
          }
          if (newValue.getTime() > this.timeTicks.slice(-1)[0].timeEnd) {
            this.refresh();
          } else {
            this.setStyleFieldByGanttData(data);
          }
          break;
        }
      }
    },
    /**
     * 监听本甘特图组件所在HTML页面上鼠标弹起时的事件
     */
    onGanttMouseUp(e) {
      // this.movedSliderElement = null; // 正在移动的slider的元素
      // this.lastMouseX = null; // 记录鼠标上一次在X轴上的位置
      // this.lastMouseY = null; // 记录鼠标上一次在Y轴上的位置
      // this.isSliderMove = false; // 滑块slider是否在移动
      // this.isSignMove = false; // sign是否在移动
      // this.signType = null;
      this.isSliderMove && this.onSliderMouseUp(e);
      this.isSignMove && this.onSignMouseUp(e);
      const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
      this.setGanttDataHover(ganttData, false);
      this.selectedIndex = null;

      window.removeEventListener("mousemove", this.onGanttMouseMove);
      window.removeEventListener("mouseup", this.onGanttMouseUp);
    },
    /**
     * 监听甘特图组件所在HTML页面上鼠标移动时的事件
     */
    onGanttMouseMove: (function () {
      let timer;
      return function (e) {
        timer && clearTimeout(timer);
        timer = setTimeout(() => {
          typeof this.selectedIndex === "string" && this.onSliderMouseMove(e);
          typeof this.selectedIndex === "string" && this.onSignMouseMove(e);
        }, 3);
      };
    })(),
    /**
     * 绑定ganttDatas之间的关系：
     *  ganttData._gantt_prevDatas中存放ganttData的前置对象
     *  ganttData._gantt_nextDatas中存放ganttData的后置对象
     */
    bindConnections() {
      const connectField = this.connectField;
      if (connectField && this.ganttDatas && this.ganttDatas.length) {
        const connectObj = {};
        this.ganttDatas.forEach((dataArr) => {
          dataArr.forEach((data) => {
            connectObj[data.source[connectField]] = data;
            data[`_gantt_prevDatas`] = new Set();
            data[`_gantt_nextDatas`] = new Set();
          });
        });
        for (const field of Object.keys(this.connectObj)) {
          const currData = connectObj[field];
          const nexts = this.connectObj[field].nexts || [];
          const prevs = this.connectObj[field].prevs || [];
          nexts.forEach((next) => {
            const nextData = connectObj[next];
            currData[`_gantt_nextDatas`].add(nextData);
            nextData[`_gantt_prevDatas`].add(currData);
          });
          prevs.forEach((prev) => {
            const prevData = connectObj[prev];
            currData[`_gantt_prevDatas`].add(prevData);
            prevData[`_gantt_nextDatas`].add(currData);
          });
        }
      }
    },
    /**
     * 初始化处理传入的数据
     */
    initDatas(datas) {
      let ganttDatas;
      if (this.isMultiRow) {
        ganttDatas = datas.map((data) =>
          data[this.multiField].map((data) => {
            return { source: data };
          })
        );
      } else {
        ganttDatas = datas.map((data) => {
          return [{ source: data }];
        });
      }
      if (ganttDatas && ganttDatas.length) {
        ganttDatas.forEach((dataArr, indexArr) => {
          dataArr.forEach((data, index) => {
            this.$set(
              data,
              `_gantt_timeStart`,
              new Date(data.source[this.timeStartField])
            );
            this.$set(
              data,
              `_gantt_timeEnd`,
              new Date(data.source[this.timeEndField])
            );
            this.$set(data, `_gantt_index`, `${indexArr}/${index}`);
          });
        });
      }
      this.ganttDatas = ganttDatas;
      this.bindConnections();
    },
    /**
     * 根据_gantt_timeStart, _gantt_timeEnd设置gantteData中style相关的值
     */
    setStyleFieldByGanttData(ganttData) {
      ganttData[`_gantt_width`] =
        getSecondsBetweenTwoTimes(
          ganttData["_gantt_timeStart"],
          ganttData["_gantt_timeEnd"]
        ) * this.secondPerHour;
      ganttData[`_gantt_translateX`] =
        getSecondsBetweenTwoTimes(
          this.timeTickStart,
          ganttData["_gantt_timeStart"]
        ) * this.secondPerHour;
      ganttData[`_gantt_rightSign_tanslateX`] = ganttData[`_gantt_width`];
      ganttData[`_gantt_leftSign_tanslateX`] = ganttData[`_gantt_translateX`];
      ganttData[`_gantt_moved`] =
        new Date(ganttData.source[this.timeStartField]).getTime() !==
          ganttData["_gantt_timeStart"].getTime() ||
        new Date(ganttData.source[this.timeEndField]).getTime() !==
          ganttData["_gantt_timeEnd"].getTime();
      this.setStyleByGanttData(ganttData);
    },
    /**
     * 根据gantteData中style相关的值，设置其对应DOM元素的样式
     */
    setStyleByGanttData(ganttData) {
      const _gantt_style = {
        transform: `scaleX(${ganttData._gantt_width / 100})`,
      };
      const _gantt_leftSignStyle = {};
      const _gantt_rightSignStyle = {
        transform: `translateX(${ganttData._gantt_rightSign_tanslateX}px)`,
      };
      const _gantt_unitStyle = {
        transform: `translateX(${ganttData._gantt_translateX}px) translateY(${
          ganttData._gantt_translateY || 0
        }px)`,
      };
      this.$set(ganttData, "_gantt_style", _gantt_style);
      this.$set(ganttData, "_gantt_unitStyle", _gantt_unitStyle);
      this.$set(ganttData, "_gantt_leftSignStyle", _gantt_leftSignStyle);
      this.$set(ganttData, "_gantt_rightSignStyle", _gantt_rightSignStyle);
    },
    /**
     * * @param {Boolean} immChange 立即修改
     * 根据距离, 移动ganttData对应slider滑块
     */
    moveSliderByInterval(ganttData, intervalX, intervalY, immChange = true) {
      if (intervalX) {
        const timeDiff = this.getTimeByINR(intervalX);
        this.moveSliderByTimeDiff(ganttData, timeDiff, immChange && !intervalY);
      }
      if (intervalY) {
        ganttData["_gantt_translateY"] =
          (ganttData["_gantt_translateY"] || 0) + (intervalY || 0);
        immChange && this.setStyleFieldByGanttData(ganttData);
      }
    },
    /**
     * @param {Number} timeDiff 时间差值, 以毫秒为单位
     * @param {Boolean} immChange 立即修改
     * 根据时间差,  移动ganttData对应slider滑块
     *
     */
    moveSliderByTimeDiff(ganttData, timeDiff, immChange = true) {
      this.$set(
        ganttData,
        "_gantt_timeStart",
        new Date(ganttData._gantt_timeStart.getTime() + timeDiff)
      );
      this.$set(
        ganttData,
        "_gantt_timeEnd",
        new Date(ganttData._gantt_timeEnd.getTime() + timeDiff)
      );
      immChange && this.setStyleFieldByGanttData(ganttData);
    },
    /**
     * @param {Number} direction 添加的方向, 从左侧添加为0, 从右侧添加为1
     * 根据距离(移动了多少像素),  增加ganttData对应slider滑块的宽度
     */
    addSliderWidthByInterval(ganttData, interval, direction = 1) {
      const timeDiff = this.getTimeByINR(interval);
      return this.addSliderWidthByTimeDiff(ganttData, timeDiff, direction);
    },
    /**
     * @param {Number} direction 添加的方向, 从左侧添加为0, 从右侧添加为1
     * 根据时间差,  增加ganttData对应slider滑块的宽度
     */
    addSliderWidthByTimeDiff(ganttData, timeDiff, direction) {
      switch (direction) {
        case 0: {
          let timeStart = new Date(
            ganttData._gantt_timeStart.getTime() + timeDiff
          );
          if (
            getTimeDiffBetweenTwoTime(timeStart, ganttData._gantt_timeEnd) > 0
          ) {
            Message.error(`开始时间不可迟于结束时间`);
            this.$set(ganttData, "_gantt_timeStart", ganttData._gantt_timeEnd);
            this.setStyleFieldByGanttData(ganttData);
            return false;
          } else if (
            getTimeDiffBetweenTwoTime(timeStart, this.timeTickStart) < 0
          ) {
            timeStart = new Date(this.timeTickStart);
            Message.error(
              `开始时间设置超过可拉取的时间下限， 请通过时间控件进行设置`
            );
            this.$set(ganttData, "_gantt_timeStart", timeStart);
            this.setStyleFieldByGanttData(ganttData);
            return false;
          } else {
            this.$set(ganttData, "_gantt_timeStart", timeStart);
            this.setStyleFieldByGanttData(ganttData);
          }
          break;
        }
        default: {
          let timeEnd = new Date(ganttData._gantt_timeEnd.getTime() + timeDiff);
          if (
            getTimeDiffBetweenTwoTime(timeEnd, ganttData._gantt_timeStart) < 0
          ) {
            Message.error(`结束时间不可早于开始时间`);
            this.$set(ganttData, "_gantt_timeEnd", ganttData._gantt_timeStart);
            this.setStyleFieldByGanttData(ganttData);
            return false;
          } else if (getTimeDiffBetweenTwoTime(timeEnd, this.timeTickEnd) > 0) {
            timeEnd = new Date(this.timeTickEnd);
            Message.error(
              `结束时间设置超过可拉取的时间上限， 请通过时间控件进行设置`
            );
            this.$set(ganttData, "_gantt_timeEnd", timeEnd);
            this.setStyleFieldByGanttData(ganttData);
            return false;
          } else {
            this.$set(ganttData, "_gantt_timeEnd", timeEnd);
            this.setStyleFieldByGanttData(ganttData);
          }
        }
      }
    },
    /**
     * 修改ganttData的_gantt_index
     */
    changeGanttDataIndex(ganttData, newIndex) {
      this.selectedIndex === ganttData["_gantt_index"] &&
        (this.selectedIndex = newIndex);
      this.$set(ganttData, `_gantt_index`, newIndex);
    },
    /**
     * 将slider移动到新行
     */
    moveSliderToNewRow(ganttData, newRowIndex) {
      const ganttDataObj = this.ganttDataObj[ganttData._gantt_index];
      this.$delete(ganttDataObj.parentArr, ganttDataObj.indexInParentArr);
      ganttDataObj.parentArr.forEach((data, index) => {
        this.changeGanttDataIndex(
          data,
          data[`_gantt_index`].replace(/\d$/, index)
        );
      });
      const tarGanttDatas = this.ganttDatas[newRowIndex];
      tarGanttDatas.push(ganttData);
      this.changeGanttDataIndex(
        ganttData,
        `${newRowIndex}/${tarGanttDatas.length - 1}`
      );
    },
    /**
     * 获取time相近的整点值
     */
    getMagneticTime(time, timeType = this.timeType) {
      if (!this.isMagnetEnabled) {
        return null;
      }
      time = new Date(time);
      switch (timeType) {
        case 0: {
          const secondRemainder = time.getMinutes() * 60;
          if (secondRemainder <= this.unitINRToSeconds * this.errPer) {
            time.setMinutes(0, 0, 0);
            return time;
          } else if (
            this.unitINRToSeconds - secondRemainder <
            this.unitINRToSeconds * this.errPer
          ) {
            time.setHours(time.getHours() + 1, 0, 0, 0);
            return time;
          } else {
            return null;
          }
        }
        case 1: {
          const secondRemainder = time.getHours() * 60 * 60;
          if (secondRemainder <= this.unitINRToSeconds * this.errPer) {
            time.setHours(0, 0, 0, 0);
            return time;
          } else if (
            this.unitINRToSeconds - secondRemainder <
            this.unitINRToSeconds * this.errPer
          ) {
            time.setDate(time.getDate() + 1);
            time.setHours(0, 0, 0, 0);
            return time;
          } else {
            return null;
          }
        }
      }
      return null;
    },
    /**
     * 根据ganttIndex获取GanttData对象
     */
    getGanttDataByGanttIndex(ganttIndex) {
      return (this.ganttDataObj[ganttIndex] || {})["data"];
    },

    /**
     * 根据距离返回代表的时间(毫秒)
     */
    getTimeByINR(interval) {
      return interval * this.secondPerPx * 1000;
    },
    /**
     * 同步与ganttData相关得其他data
     */
    syncConnectedGanttData(ganttDatas, rowBindType = this.rowBindType) {
      ganttDatas.forEach((ganttData) => {
        ganttData._gantt_prevDatas.forEach((prevData) => {
          const { field, value, checkFunction } = this.getBindedGanttDataTime(
            ganttData,
            0,
            rowBindType
          );
          if (checkFunction(prevData) === false) {
            this.moveSliderByTimeDiff(
              prevData,
              getTimeDiffBetweenTwoTime(value, prevData[field])
            );
            this.syncConnectedGanttData([prevData]);
          }
        });
      });
      ganttDatas.forEach((ganttData) => {
        ganttData._gantt_nextDatas.forEach((nextData) => {
          const { field, value, checkFunction } = this.getBindedGanttDataTime(
            ganttData,
            1,
            rowBindType
          );
          if (checkFunction(nextData) === false) {
            this.moveSliderByTimeDiff(
              nextData,
              getTimeDiffBetweenTwoTime(value, nextData[field])
            );
            this.syncConnectedGanttData([nextData]);
          }
        });
      });
    },
    /**
     * 设置ganttData的hover状态
     * @param {Object} ganttData ganttData对象
     * @param {Boolean} isHover isHover的值
     */
    setGanttDataHover(ganttData, isHover) {
      this.$set(ganttData, "isHover", !!isHover);
      this.syncConnectedGanttDataHover([ganttData], isHover);
    },
    /**
     * 同步与ganttData相关得其他data
     */
    syncConnectedGanttDataHover(ganttDatas, isRelatedShow) {
      ganttDatas.forEach((ganttData) => {
        ganttData._gantt_prevDatas.forEach((prevData) => {
          if (!prevData.isHover && !(!!prevData.isRelated === isRelatedShow)) {
            this.$set(prevData, "isRelated", isRelatedShow);
            this.syncConnectedGanttDataHover([prevData], isRelatedShow);
          }
        });
      });

      ganttDatas.forEach((ganttData) => {
        ganttData._gantt_nextDatas.forEach((nextData) => {
          if (!nextData.isHover && !(!!nextData.isRelated === isRelatedShow)) {
            this.$set(nextData, "isRelated", isRelatedShow);
            this.syncConnectedGanttDataHover([nextData], isRelatedShow);
          }
        });
      });
    },
    /**
     * TODO:添加注释, 修改合理的名字
     * @param {Number} direction 方向: 0为prev, 1为next
     */
    getBindedGanttDataTime(
      ganttData,
      direction,
      rowBindType = this.rowBindType
    ) {
      let value, field, checkFunction;
      switch (direction) {
        case 0: {
          switch (rowBindType) {
            // 同时开始
            case 0: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeStart;
              checkFunction = (tarGanttData) => {
                return value.getTime() === tarGanttData[field].getTime();
              };
              break;
            }
            case 1: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeEnd;
              checkFunction = (tarGanttData) => {
                return value.getTime() === tarGanttData[field].getTime();
              };
              break;
            }
            case 2: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeStart;
              checkFunction = (tarGanttData) => {
                return (
                  getTimeDiffBetweenTwoTime(value, tarGanttData[field]) === 0
                );
              };
              break;
            }
          }
          break;
        }
        case 1: {
          switch (rowBindType) {
            case 0: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeStart;
              checkFunction = (tarGanttData) => {
                return value.getTime() === tarGanttData[field].getTime();
              };
              break;
            }
            case 1: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeEnd;
              checkFunction = (tarGanttData) => {
                return value.getTime() === tarGanttData[field].getTime();
              };
              break;
            }
            case 2: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeEnd;
              checkFunction = (tarGanttData) => {
                return (
                  getTimeDiffBetweenTwoTime(value, tarGanttData[field]) === 0
                );
              };
              break;
            }
          }
          break;
        }
      }
      return { field, value, checkFunction };
    },
  },
};
</script>

<style lang="scss">
// $gantt_column_name_width: 160px;
$gantt_height: 32px;

$border_color: #a9a9a9;

.gantt_container {
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
  user-select: none;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  .gantt_tools {
    .gantt_tool {
      display: inline-flex;
      align-items: center;
      margin-right: 36px;
      .gantt_tool_label {
        margin-right: 2px;
        font-weight: bolder;
      }
    }
  }
  .tick_unit {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-sizing: border-box;
    border-top: 1px $border_color solid;
    border-right: 1px $border_color solid;
    background-image: radial-gradient(ellipse, #390eabf7, #390eab);
    flex-shrink: 0;
  }
  .tick_unit.tick_column {
    // width: $gantt_column_name_width;
  }
  .gantt_row_container {
    display: inline-block;
    box-sizing: content-box;
  }

  .gantt_row {
    width: 100%;
    display: flex;
    min-height: $gantt_height;
    transition: height ease-out 0.5s;
    .gantt_name {
      // width: $gantt_column_name_width;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-right: 1px solid $border_color;
      box-sizing: border-box;
    }
    .gantt_time {
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid $border_color;
      box-sizing: border-box;
    }

    .gantt_name {
      background: inherit;
      position: sticky;
      z-index: 2;
    }

    .gantt_content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 119px,
        $border_color,
        $border_color 120px
      );
      background-size: 100% 100%;
      overflow: hidden;
      transition: width ease-out 0.5s;
      @mixin setBgColor($var) {
        .gantt_slider {
          background: rgba($var, 0.45);
        }
        .gantt_slider.isHover {
          background-color: rgba($var, 0.75);
        }
        .gantt_sign {
          background: rgba($var, 0.56);
          &.left_sign {
            background: linear-gradient(to left, #00000000, rgba($var, 0.56));
          }
          &.right_sign {
            background: linear-gradient(to right, #00000000, rgba($var, 0.56));
          }
        }
      }
      .gantt_unit {
        width: max-content;
        height: $gantt_height;
        position: relative;
        transition: transform ease-out 0.5s;
        @include setBgColor(#6ec8ec);
        &.moved {
          @include setBgColor(#ff9b58);
        }
        &.related {
          @include setBgColor(#e8eb4b);
        }
        .gantt_slider,
        .gantt_unit_text {
          cursor: pointer;
        }
        .gantt_slider {
          width: 100px;
          height: 100%;
          transform-origin: left;
          box-sizing: border-box;

          transition: all ease-out 0.5s;
        }
        .gantt_sign {
          width: 2px;
          height: 100%;
          box-sizing: border-box;
          background: #bae1f0;
          opacity: 1;
          z-index: 1;
          position: absolute;
          top: 0;
          cursor: w-resize;
          transition: transform ease-out 0.5s;
          &.left_sign {
            // margin-left: -2px;
            width: 10px;
          }
          &.right_sign {
            width: 10px;
            margin-left: -10px;
          }
        }
        .gantt_unit_text {
          position: absolute;
          top: 50%;
          white-space: nowrap;
          transform: translate(12px, -50%);
          font-weight: bolder;
        }
      }
    }
    &:nth-child(even) {
      background-color: #f5f5f5;
    }
    &:nth-child(odd) {
      background-color: #fff;
    }
  }
  .gantt_tick_container {
    width: max-content;
    height: 76px;
    display: flex;
    flex-direction: row;
    color: #ffffff;
    position: sticky;
    top: 0;
    z-index: 3;
    .tick_day {
      position: relative;
    }
    .tick_wrapper {
      display: flex;
    }
    .gantt_columns {
      width: max-content;
      display: flex;
      flex-wrap: nowrap;
      position: sticky;
      z-index: 3;
      left: 0;
      > .tick_unit {
        height: 100%;
      }
    }
    .gantt_ticks {
      display: inline-flex;
      flex-direction: row;
      > .tick_unit {
        display: flex;
        flex-direction: column;
        .tick_unit_date {
          margin: 2px 0;
        }
        .tick_unit_time {
          margin: 2px 0;
        }
      }
    }
  }
  .gantt_data_wrapper {
    display: flex;
  }
  .gantt_data_container {
    overflow: auto;
    height: 100%;
    display: inline-flex;
    flex-direction: column;

    .gantt_row {
      flex-direction: row;
    }
  }
}
.gantt_message {
  min-width: 380px;
  max-width: 50%;
  min-height: 50px;
  max-height: 50%;
  box-sizing: border-box;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  position: fixed;
  left: 50%;
  top: 20%;
  transform: translateX(-50%);
  background-color: #edf2fc;
  color: #909399;
  transition: opacity 0.3s, transform 0.4s, top 0.4s;
  overflow: hidden;
  padding: 15px 15px 15px 20px;
  display: flex;
  align-items: center;
  z-index: 9000;
  &.success {
    color: #67c23a;
    background-color: #f0f9eb;
    border-color: #e1f3d8;
  }
  &.error {
    color: #f56c6c;
    background-color: #fef0f0;
    border-color: #fde2e2;
  }
}
</style>
