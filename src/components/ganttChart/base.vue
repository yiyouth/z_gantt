<template>
  <div class="gantt_container" style="height: 50%">
    <div class="gantt_tools">
      <div class="gantt_tool"></div>
      <div class="gantt_tool">
        <span class="gantt_tool"> </span>
        <span class="gantt_tool"> </span>
        <span class="gantt_tool"> </span>
        <span class="gantt_tool"> </span>
        <span class="gantt_tool"> </span>
        <span class="gantt_tool" @click="refresh"></span>
        <span class="gantt_tool" @click="onSave"></span>
      </div>
    </div>
    <div class="gantt_wrapper">
      <div class="gantt_time_control_container">
        <div
          v-for="(ganttDataArr, index) in ganttDataArrs"
          :key="index"
          class="gantt_time_control_rows"
          :style="{
            height: `${(multiField ? ganttDataArr.length : 1) * 32}px`,
          }"
        >
          <div
            v-for="(ganttData, index1) in ganttDataArr"
            :key="index1"
            class="gantt_time_control_row"
          >
            <GanttCalendar
              :data="ganttData"
              field="_gantt_timeStart"
              class="gantt_time_control"
              @dateTimeChange="onTimeControlChange"
            />
            <GanttCalendar
              :data="ganttData"
              field="_gantt_timeEnd"
              class="gantt_time_control"
              @dateTimeChange="onTimeControlChange"
            />
          </div>
        </div>
      </div>
      <div>
        <div class="gantt_time_container">
          <div
            v-for="(columnInfo, index) in columnInfos"
            :key="index"
            class="gantt_time"
            :style="{ width: `${columnInfo.width}px` }"
          >
            {{ columnInfo.tick.displayStr }}
          </div>
        </div>
        <div
          class="gantt_row_container"
          @mousedown="onContainerMouseDown($event)"
          @mouseover="onContainerMouseOver($event)"
          @mouseout="onContainerMouseLeave($event)"
          :style="{
            top: `${ganttRowsLocation.top}px`,
            left: `${ganttRowsLocation.left}px`,
          }"
        >
          <div
            v-for="(ganttDataArr, index) in ganttDataArrs"
            :key="index"
            class="gantt_row"
            :style="{
              height: `${(multiField ? ganttDataArr.length : 1) * 32}px`,
            }"
          >
            <div
              class="gantt_content"
              :data-index="index"
              :style="{ width: `${timeColumnWidth}px` }"
            >
              <div
                :class="{
                  gantt_unit: true,
                  moved: ganttData._gantt_moved,
                  related: ganttData.isRelated,
                  unabled: ganttData._gantt_isUnabled,
                }"
                :style="ganttData._gantt_unitStyle"
                v-for="(ganttData, index1) in ganttDataArr"
                :key="index1"
                :data-index="ganttData._gantt_index"
                :title="
                  '开始时间: ' +
                  formatTime(ganttData['_gantt_timeStart'], 0) +
                  '\n结束时间: ' +
                  formatTime(ganttData['_gantt_timeEnd'], 0)
                "
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
                />
                <div
                  :class="[
                    'gantt_sign',
                    ganttData._gantt_width ? 'right_sign' : '',
                  ]"
                  :style="ganttData._gantt_rightSignStyle"
                />
                <div class="gantt_unit_text" v-if="ganttData[ganttTextField]">
                  {{ ganttData[ganttTextField] }}
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

import {
  Message,
  isNullOrEmpty,
  getDateProxy,
  getTimeDiffBetweenTwoTime,
  TimeTypeClasses,
  formatNumber,
} from "./assets/utils/util";
import { RowBindTypeEnum } from "./assets/utils/constant.js";
import BaseUtil from "./assets/utils/BaseUtil";
const { sub } = BaseUtil.Number;
import DateTime from "./components/DateTime";
export default {
  components: { GanttCalendar: DateTime },
  props: {
    datas: {
      type: Array,
      default() {
        return [];
      },
    },
    columnTest: {
      type: Boolean,
      default() {
        return true;
      },
    },
    // 时间间隔的类型
    dateType: {
      type: Number,
      default() {
        return 0;
      },
    },
    dataModule: {
      type: Object,
    },
    isMultiRow: {
      type: Boolean,
      default() {
        return false;
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
    unableField: {
      type: String,
      default() {
        return "unabled";
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
  },
  watch: {
    // dateType: function (dateType) {
    //   this.setDateTypeHander(dateType);
    // },
  },
  computed: {
    timeColumnWidth: (vm) => {
      let width;
      if (vm.columnInfos && vm.columnInfos.length) {
        width = vm.columnInfos
          .map((columnInfo) => columnInfo.width)
          .reduce((prev, next) => {
            return prev + next;
          });
      }
      return width || 0;
    },
  },
  data() {
    return {
      ganttDataArrs: [],
      ganttRowsLocation: {},
      columnInfos: [],
      isMagnetEnabled: true, // 是否使用吸附
      dateTypeHandler: null,
      rowBindType: 0, // 绑定的类型
      RowBindTypeEnum,
      isMoveYEnabled: true,
      errPer: 0.5,
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

      mouseMoveTimer: null,
    };
  },
  created() {
    // window.asd = this;
    this.setDateTypeHander();
    this.init();
  },
  methods: {
    /**
     * 保存时，将滑块的起止时间赋值给源数据
     */
    onSave() {
      for (const ganttDataArr of this.ganttDataArrs) {
        for (const ganttData of ganttDataArr) {
          this.$set(
            ganttData,
            this.timeStartField,
            ganttData["_gantt_timeStart"]
          );
          this.$set(ganttData, this.timeEndField, ganttData["_gantt_timeEnd"]);
          this.setStyleFieldByGanttData(ganttData);
        }
      }
      if (this.isMultiRow && this.multiField) {
        for (let index = 0; index < this.datas.length; index++) {
          this.$set(
            this.datas[index],
            this.multiField,
            this.ganttDataArrs[index]
          );
        }
      }
    },
    /**
     * 清除组件注入的相关字段
     */
    onClear() {
      this.ganttDataArrs.forEach((ganttDataArr) => {
        ganttDataArr.forEach((ganttData) => {
          for (const key of Object.keys(ganttData)) {
            if (key.startsWith("_gantt_")) {
              this.$delete(ganttData, key);
            }
          }
        });
      });
    },
    onIsMagnetEnabledChange(isMagnetEnabled) {
      if (isMagnetEnabled) {
        this.errPer = 0.5;
      } else {
        this.errPer = 0;
      }
    },
    onChangeColumnWidth() {
      this.refresh();
    },
    onTimeControlChange(field, ganttData) {
      const newValue = ganttData[field];
      switch (field) {
        case "_gantt_timeStart": {
          this.setGanttDataTime(ganttData, newValue, 0);
          this.syncConnectedGanttData(ganttData);
          break;
        }
        case "_gantt_timeEnd": {
          this.setGanttDataTime(ganttData, newValue, 1);
          this.syncConnectedGanttData(ganttData);
          break;
        }
      }
    },
    /**
     * 时间间隔类型改变时
     */
    onTimeTypeChange() {
      this.setDateTypeHander(this.dateType);
      this.initChart();
    },
    /**
     * 工具栏中起始时间修改后的事件
     * @param {Date} timeTickStart 起始时间
     */
    onLabelTickStartChange(timeTickStart) {
      this.initChart(timeTickStart);
    },
    /**
     * 工具栏中结束时间修改后的事件
     * @param {Date} timeTickEnd 起始时间
     */
    onLabelTickEndChange(timeTickEnd) {
      this.initChart(null, timeTickEnd);
    },
    Fibonacci(n, p1 = 1, p2 = 1) {
      if (n <= 1) {
        return p2;
      }
      const p3 = p1 + p2;
      p1 = p2;
      p2 = p3;
      return this.Fibonacci(n - 1, p1, p2);
    },
    /**
     * 监听slider与sign的祖父容器gantt_row_container的鼠标按下事件
     * @param {Object} event 事件对象
     */
    onContainerMouseDown(event) {
      window.removeEventListener("mousemove", this.onGanttMouseMove);
      window.removeEventListener("mouseup", this.onGanttMouseUp);
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
        const selectedIndex = event.target.parentElement.dataset.index;
        const ganttData = this.getGanttDataByGanttIndex(selectedIndex);
        if (ganttData[this.unableField]) {
          return;
        }
        this.selectedIndex = selectedIndex;
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

        this.syncConnectedGanttData(ganttData);
      }
    },
    /**
     * 滑块的父容器上绑定的鼠标移动事件， 用于设置hover样式
     * @param {Object} event 事件对象
     */
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
    /**
     * 滑块的父容器上绑定的鼠标移出事件， 用于设置hover样式
     * @param {Object} event 事件对象
     */
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
     * @param {Object} event 事件对象
     */
    onSliderMouseDown(event) {
      this.isSliderMove = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      let srcElement = event.srcElement;
      while (
        srcElement &&
        typeof srcElement.className === "string" &&
        srcElement.className.search(/\bgantt_unit\b/) === -1
      ) {
        srcElement = srcElement.parentElement;
      }
      if (srcElement) {
        this.movedSliderElement = srcElement;
      }
    },
    /**
     * 监听slider的鼠标按下-弹起之间鼠标移动事件
     * @param {Object} event 事件对象
     */
    onSliderMouseMove(event) {
      if (this.isSliderMove) {
        const intervalX = sub(event.clientX, this.lastMouseX);
        const intervalY = this.isMoveYEnabled
          ? sub(event.clientY, this.lastMouseY)
          : 0;
        const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
        this.moveSliderByTranslateX(ganttData, intervalX, intervalY);
        this.lastMouseX = event.clientX; // 更新鼠标在X轴的位置
        this.lastMouseY = event.clientY; // 更新鼠标在Y轴的位置
        if (this.rowBindType !== RowBindTypeEnum.NotRelated.value) {
          this.syncIntervalInConnectedGanttData(ganttData, intervalX);
        }
      }
    },
    /**
     * 监听slider的鼠标弹起事件
     * @param {Object} event 事件对象
     */
    onSliderMouseUp(event) {
      this.isSliderMove = false;
      const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
      const timeStart = this.getTimeBytranslateX(
        ganttData["_gantt_translateX"]
      );
      const timeEnd = this.getTimeBytranslateX(
        ganttData["_gantt_translateX"] + ganttData["_gantt_width"]
      );
      this.$set(ganttData, "_gantt_timeStart", timeStart);
      this.$set(ganttData, "_gantt_timeEnd", timeEnd);
      if (timeEnd.getTime() > this.timeTickEnd) {
        this.moveSliderToTime(ganttData, new Date(this.timeTickEnd), 1);
      } else {
        const magneticTime = this.getMagneticTimeByTranslateX(
          ganttData._gantt_translateX
        );
        if (magneticTime) {
          this.moveSliderToTime(ganttData, magneticTime, 0, false);
        }
      }
      let tarRowElement;
      for (const ele of event.path) {
        if (
          ele.className &&
          typeof ele.className === "string" &&
          ele.className.search(/\bgantt_content\b/) !== -1
        ) {
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
      this.moveSlider(ganttData, 0, -ganttData._gantt_translateY, false);
      this.setStyleFieldByGanttData(ganttData);
      this.syncConnectedGanttData(ganttData);
    },
    /**
     * 监听sign的鼠标按下事件
     * @param {Object} event 事件对象
     * @param {Number} signType sign的type, 0为左边的sign, 1为右边的sign
     */
    onSignMouseDown(event, signType) {
      this.signType = signType;
      this.isSignMove = true;
      this.lastMouseX = event.clientX;
    },
    /**
     * 监听sign的鼠标按下，弹起之间鼠标移动事件
     * @param {Object} event 事件对象
     */
    onSignMouseMove(event) {
      if (this.isSignMove) {
        const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
        const clientX = event.clientX;
        const interval = clientX - this.lastMouseX;
        this.addSliderWidthByInterval(ganttData, interval, this.signType);
        this.lastMouseX = clientX;
        if (this.rowBindType !== RowBindTypeEnum.NotRelated.value) {
          this.sync(
            ganttData,
            (prevData) => {
              if (
                (this.signType === 0 &&
                  (this.rowBindType === RowBindTypeEnum.StartAtSameTime.value ||
                    this.rowBindType ===
                      RowBindTypeEnum.StartAfterPrevEnd.value)) ||
                (this.signType === 1 &&
                  this.rowBindType === RowBindTypeEnum.EndAtSameTime.value)
              ) {
                this.moveSliderByTranslateX(prevData, interval);
              }
            },
            (nextData) => {
              if (
                (this.signType === 0 &&
                  this.rowBindType === RowBindTypeEnum.StartAtSameTime.value) ||
                (this.signType === 1 &&
                  (this.rowBindType === RowBindTypeEnum.EndAtSameTime.value ||
                    this.rowBindType ===
                      RowBindTypeEnum.StartAfterPrevEnd.value))
              ) {
                this.moveSliderByTranslateX(nextData, interval);
              }
            }
          );
        }
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
          const magneticTime = this.getMagneticTimeByTranslateX(
            ganttData["_gantt_translateX"]
          );
          if (magneticTime) {
            this.setGanttDataTime(ganttData, magneticTime, 0);
          }
          break;
        }
        // 默认为右边的sign
        default: {
          const magneticTime = this.getMagneticTimeByTranslateX(
            ganttData["_gantt_translateX"] + ganttData["_gantt_width"]
          );
          if (magneticTime) {
            this.setGanttDataTime(ganttData, magneticTime, 1);
          }
        }
      }
      this.syncConnectedGanttData(ganttData);
      this.isSignMove = false;
      this.signType = null;
    },
    /**
     * 监听本甘特图组件所在HTML页面上鼠标弹起时的事件
     * @param {Object} event 事件对象
     */
    onGanttMouseUp(event) {
      // this.movedSliderElement = null; // 正在移动的slider的元素
      // this.lastMouseX = null; // 记录鼠标上一次在X轴上的位置
      // this.lastMouseY = null; // 记录鼠标上一次在Y轴上的位置
      // this.isSliderMove = false; // 滑块slider是否在移动
      // this.isSignMove = false; // sign是否在移动
      // this.signType = null;
      this.isSliderMove && this.onSliderMouseUp(event);
      this.isSignMove && this.onSignMouseUp(event);
      const ganttData = this.getGanttDataByGanttIndex(this.selectedIndex);
      this.setGanttDataHover(ganttData, false);
      this.selectedIndex = null;
      window.removeEventListener("mousemove", this.onGanttMouseMove);
      window.removeEventListener("mouseup", this.onGanttMouseUp);
    },
    /**
     * 监听甘特图组件所在HTML页面上鼠标移动时的事件, 使用事件防抖， 每10ms最多触发一次
     */
    onGanttMouseMove(e) {
      this.mouseMoveTimer && clearTimeout(this.mouseMoveTimer);
      this.mouseMoveTimer = setTimeout(() => {
        typeof this.selectedIndex === "string" && this.onSliderMouseMove(e);
        typeof this.selectedIndex === "string" && this.onSignMouseMove(e);
      }, 10);
    },
    /**
     * 绑定ganttDatas之间的关系：
     *  ganttData._gantt_prevDatas中存放ganttData的前置对象
     *  ganttData._gantt_nextDatas中存放ganttData的后置对象
     */
    bindConnections() {
      const connectField = this.connectField;
      if (connectField && this.ganttDataArrs && this.ganttDataArrs.length) {
        const connectObj = {};
        this.ganttDataArrs.forEach((dataArr) => {
          dataArr.forEach((data) => {
            connectObj[data[connectField]] = data;
            data[`_gantt_prevDatas`] = new Set();
            data[`_gantt_nextDatas`] = new Set();
          });
        });
        for (const field of Object.keys(this.connectObj)) {
          const currData = connectObj[field];
          if (!currData) {
            continue;
          }
          const nexts = this.connectObj[field].nexts || [];
          const prevs = this.connectObj[field].prevs || [];
          nexts.forEach((next) => {
            const nextData = connectObj[next];
            if (nextData) {
              currData[`_gantt_nextDatas`].add(nextData);
              nextData[`_gantt_prevDatas`].add(currData);
            }
          });
          prevs.forEach((prev) => {
            const prevData = connectObj[prev];
            if (prevData) {
              currData[`_gantt_prevDatas`].add(prevData);
              prevData[`_gantt_nextDatas`].add(currData);
            }
          });
        }
      }
    },

    /**
     * 设置dateTypeHandler
     * @param {Number} dateType date类型
     */
    setDateTypeHander(dateType = this.dateType) {
      dateType = dateType || 0;
      const Cls = TimeTypeClasses[dateType];
      this.dateTypeHandler = new Cls();
    },
    formatTime(val, dateType) {
      return BaseUtil.Date.formatDateTime(val, dateType);
    },
    /**
     * 初始化处理传入的数据
     */
    init() {
      const datas = this.datas;
      let ganttDataArrs;
      if (this.isMultiRow) {
        ganttDataArrs = datas.map((data) =>
          data[this.multiField].map((data) => {
            return data;
          })
        );
      } else {
        ganttDataArrs = datas.map((data) => {
          return [data];
        });
      }
      if (ganttDataArrs && ganttDataArrs.length) {
        ganttDataArrs.forEach((dataArr, indexArr) => {
          dataArr.forEach((data, index) => {
            this.initGanttDataTime(data);
            data[`_gantt_index`] = `${indexArr}/${index}`;
          });
        });
      }
      this.ganttDataArrs = ganttDataArrs;
      this.bindConnections();
      this.initChart();
    },
    /**
     * 初始化record中的时间字段
     */
    initGanttDataTime(record) {
      this.$set(
        record,
        `_gantt_timeStart`,
        new Date(record[this.timeStartField])
      );
      this.$set(record, `_gantt_timeEnd`, new Date(record[this.timeEndField]));
    },
    /**
     * 刷新
     */
    refreshTimeInRecord(ganttData) {
      this.initGanttDataTime(ganttData);
      this.setStyleFieldByGanttData(ganttData);
    },
    /**
     * 刷新函数
     * @param {Date} startTick 组件表格中起始的时间点
     * @param {Date} endTick 组件表格中结束的时间点
     */
    initChart(startTick = null, endTick = null) {
      if (!this.isMultiRow && this.isMoveYEnabled) {
        this.isMoveYEnabled = false;
      }
      let timeStartTick, timeEndTick;
      // 根据ganttDatas的数据，获取最早的timeStart以及最晚的timeEnd，用来设置可滚动区域的起止时间
      for (const ganttDataArr of this.ganttDataArrs) {
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

      this.timeTicks = this.dateTypeHandler.getTimeTicks(
        startTick,
        endTick,
        this.dateType
      );
      let columnInfos = [];
      if (this.timeTicks.length) {
        // 添加时间列
        this.timeTickStart = this.timeTicks[0];
        this.timeTickEnd = getDateProxy(
          this.timeTicks.slice(-1)[0].timeEnd,
          this.dateTypeHandler
        );

        if (this.columnTest) {
          let translateX = 0;
          const width = 60;
          for (
            let index = 0, tickLength = this.timeTicks.length;
            index < tickLength;
            index++
          ) {
            const tick = this.timeTicks[index];
            columnInfos.push({
              width,
              tick,
              translateX,
            });
            translateX += width;
          }
          this.columnInfos = columnInfos;
        }
        // 根据ganttData的数据，设置对应进度条的样式
        this.refresh();
      }
      this.columnInfos = columnInfos;
    },
    /**
     * 设置列的颜色
     */
    setColumnColor() {
      //   let excludeTimeColumnsCount = 0;
      //   for (const column of this.$refs.grid.columns) {
      //     if (!column.field.startsWith("_gantt_timeColumn")) {
      //       column.isFixed = true;
      //       excludeTimeColumnsCount += 1;
      //     }
      //   }
      //   let restDayIndexs = new Set();
      //   for (let index = 0; index < this.columnInfos.length; index++) {
      //     const columnInfo = this.columnInfos[index];
      //     if (columnInfo.tick.isRestDay) {
      //       restDayIndexs.add(index + excludeTimeColumnsCount);
      //     }
      //   }
      //   restDayIndexs = [...restDayIndexs];
      //   const rowElements =
      //     this.$refs.grid.elements.bodyRight.querySelectorAll(
      //       "table > tbody > tr"
      //     );
      //   for (let rowElement of rowElements) {
      //     const unitElements = rowElement.querySelectorAll("td");
      //     for (let index = 0; index < unitElements.length; index++) {
      //       const unitElement = unitElements[index];
      //       let className = unitElement.className;
      //       className = className
      //         .replace(/\s*\bganttShadow\b\s*/, " ")
      //         .replace(/^\s+|\s+$/g, "");
      //       if (restDayIndexs.indexOf(index) !== -1) {
      //         className += " ganttShadow";
      //       }
      //       unitElement.className = className;
      //     }
      //   }
    },
    /**
     * 根据ganttData的数据，设置对应进度条的样式
     */
    refresh() {
      this.ganttDataArrs.forEach((ganttDataArr) => {
        ganttDataArr.forEach((ganttData) => {
          this.setStyleFieldByGanttData(ganttData);
        });
      });
    },
    /**
     * 根据_gantt_timeStart, _gantt_timeEnd设置gantteData中style相关的值
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Boolean} immChange 是否立即修改，直接计算css属性值，并且更新样式
     */
    setStyleFieldByGanttData(ganttData, immChange = true) {
      const translateXByTimeStart = this.getTranslateXByTime(
        ganttData["_gantt_timeStart"]
      );
      const translateXByTimeEnd = this.getTranslateXByTime(
        ganttData["_gantt_timeEnd"]
      );
      ganttData[`_gantt_translateX`] = translateXByTimeStart;
      ganttData[`_gantt_width`] = translateXByTimeEnd - translateXByTimeStart;
      ganttData[`_gantt_isUnabled`] = !!ganttData[this.unableField];
      ganttData[`_gantt_moved`] =
        new Date(ganttData[this.timeStartField]).getTime() !==
          ganttData["_gantt_timeStart"].getTime() ||
        new Date(ganttData[this.timeEndField]).getTime() !==
          ganttData["_gantt_timeEnd"].getTime();
      immChange && this.setStyleByGanttData(ganttData);
    },
    /**
     * 根据gantteData中style相关的值，设置其对应DOM元素的样式
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     */
    setStyleByGanttData(ganttData) {
      const _gantt_style = {
        transform: `translate3d(0,0,0) scaleX(${ganttData._gantt_width / 100})`,
      };
      const _gantt_leftSignStyle = {
        transform: `translate3d(0,0,0)`,
      };
      const _gantt_rightSignStyle = {
        transform: `translate3d(${ganttData._gantt_width}px,0,0)`,
      };
      const _gantt_unitStyle = {
        transform: `translate3d(${ganttData._gantt_translateX}px,${
          ganttData._gantt_translateY || 0
        }px,0)`,
      };
      this.$set(ganttData, "_gantt_style", _gantt_style);
      this.$set(ganttData, "_gantt_unitStyle", _gantt_unitStyle);
      this.$set(ganttData, "_gantt_leftSignStyle", _gantt_leftSignStyle);
      this.$set(ganttData, "_gantt_rightSignStyle", _gantt_rightSignStyle);
    },
    moveSliderByTranslateX(ganttData, intervalX, intervalY, immChange = true) {
      ganttData["_gantt_translateX"] =
        (ganttData["_gantt_translateX"] || 0) + (intervalX || 0);
      ganttData["_gantt_translateY"] =
        (ganttData["_gantt_translateY"] || 0) + (intervalY || 0);
      immChange && this.setStyleByGanttData(ganttData);
    },
    /**
     * 根据距离, 移动ganttData对应slider滑块
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} intervalX X轴上的位移量
     * @param {Number} intervalY Y轴上的位移量
     * @param {Boolean} immChange 是否立即修改，直接计算css属性值，并且更新样式
     */
    moveSlider(ganttData, intervalX, intervalY, immChange = true) {
      const _gantt_translateX =
        (ganttData["_gantt_translateX"] || 0) + (intervalX || 0);
      ganttData["_gantt_translateY"] =
        (ganttData["_gantt_translateY"] || 0) + (intervalY || 0);

      this.$set(
        ganttData,
        "_gantt_timeStart",
        this.getTimeBytranslateX(_gantt_translateX)
      );
      this.$set(
        ganttData,
        "_gantt_timeEnd",
        this.getTimeBytranslateX(_gantt_translateX + ganttData["_gantt_width"])
      );
      this.setStyleFieldByGanttData(ganttData, immChange);
    },
    /**
     * 根据距离, 移动ganttData对应slider滑块
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Date} time 要移动到的时间值
     * @param {Number} timeType 时间值的类型 0: 设置起始时间, 1: 设置结束时间
     * @param {Boolean} immChange 是否立即修改，直接计算css属性值，并且更新样式
     */
    moveSliderToTime(ganttData, time, timeType = 0, immChange = true) {
      const translateXOfTime = this.getTranslateXByTime(time);
      switch (timeType) {
        case 0: {
          const translateXOfTimeStart = ganttData["_gantt_translateX"];
          this.moveSlider(
            ganttData,
            translateXOfTime - translateXOfTimeStart || 0,
            0,
            immChange
          );
          break;
        }
        case 1: {
          const translateXOfTimeEnd =
            ganttData["_gantt_translateX"] + ganttData["_gantt_width"];
          this.moveSlider(
            ganttData,
            translateXOfTime - translateXOfTimeEnd || 0,
            0,
            immChange
          );
          break;
        }
      }
    },
    /**
     * 根据距离(移动了多少像素),  增加ganttData对应slider滑块的宽度
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} interval 添加的长度
     * @param {Number} direction 添加的方向, 从左侧添加为0, 从右侧添加为1
     */
    addSliderWidth(ganttData, interval, direction = 1) {
      switch (direction) {
        case 0: {
          const time = this.getTimeBytranslateX(
            ganttData["_gantt_translateX"] + interval
          );
          return this.setGanttDataTime(ganttData, time, 0);
        }
        default: {
          const time = this.getTimeBytranslateX(
            ganttData["_gantt_translateX"] +
              ganttData["_gantt_width"] +
              interval
          );
          return this.setGanttDataTime(ganttData, time, 1);
        }
      }
    },
    addSliderWidthByInterval(ganttData, interval, direction = 1) {
      switch (direction) {
        case 0: {
          ganttData["_gantt_width"] -= interval || 0;
          ganttData["_gantt_translateX"] += interval || 0;
          this.setStyleByGanttData(ganttData);
          break;
        }
        default: {
          ganttData["_gantt_width"] += interval || 0;
          this.setStyleByGanttData(ganttData);
          break;
        }
      }
    },
    /**
     * 直接修改ganttData的开始时间或者结束时间
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Date} time 要移动到的时间值
     * @param {Number} timeType 时间值的类型 0: 设置起始时间, 1: 设置结束时间
     */
    setGanttDataTime(ganttData, time, timeType) {
      switch (timeType) {
        case 0: {
          let timeStart = time;
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
          let timeEnd = time;
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
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {String} newIndex 新的索引
     */
    changeGanttDataIndex(ganttData, newIndex) {
      this.selectedIndex === ganttData["_gantt_index"] &&
        (this.selectedIndex = newIndex);
      this.$set(ganttData, `_gantt_index`, newIndex);
    },
    /**
     * 将slider移动到新行
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} newRowIndex 新行的索引
     */
    moveSliderToNewRow(ganttData, newRowIndex) {
      const ganttIndex = ganttData["_gantt_index"];
      const indexArr = ganttIndex.split("/")[0];
      const index = ganttIndex.split("/")[1];
      const ganttDataArr = this.ganttDataArrs[indexArr];
      this.$delete(ganttDataArr, index);
      ganttDataArr.forEach((data, index) => {
        this.changeGanttDataIndex(
          data,
          data[`_gantt_index`].replace(/\d$/, index)
        );
      });
      const tarGanttDatas = this.ganttDataArrs[newRowIndex];
      tarGanttDatas.push(ganttData);
      this.changeGanttDataIndex(
        ganttData,
        `${newRowIndex}/${tarGanttDatas.length - 1}`
      );
    },
    /**
     * 根据ganttIndex获取GanttData对象
     * @param {String} ganttIndex 要获取的ganttData的索引
     */
    getGanttDataByGanttIndex(ganttIndex) {
      ganttIndex = ganttIndex || "";
      const indexs = ganttIndex.split("/");
      let indexArr = indexs[0];
      let index = indexs[1];
      return (
        (this.ganttDataArrs[indexArr] && this.ganttDataArrs[indexArr][index]) ||
        {}
      );
    },
    /**
     * 同步与ganttData相关得其他data
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} rowBindType 滑块之间的绑定模式
     */
    syncConnectedGanttData(ganttData, rowBindType = this.rowBindType) {
      this.sync(
        ganttData,
        (prevData, currData) => {
          const { field, value } = this.getBindedGanttDataTime(
            currData,
            0,
            rowBindType
          );

          if (value) {
            this.moveSliderToTime(
              prevData,
              value,
              field === "_gantt_timeStart"
                ? 0
                : field === "_gantt_timeEnd"
                ? 1
                : null
            );
          }
        },
        (nextData, currData) => {
          const { field, value } = this.getBindedGanttDataTime(
            currData,
            1,
            rowBindType
          );
          if (value) {
            this.moveSliderToTime(
              nextData,
              value,
              field === "_gantt_timeStart"
                ? 0
                : field === "_gantt_timeEnd"
                ? 1
                : null
            );
          }
        }
      );
    },
    /**
     * 同步函数, 通过ganttData.prevDatas, ganttData.nextDatas递归ganttDatas, 每个被关联的ganttData节点只遍历一次
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     */
    sync(ganttData, prevCallback, nextCallback) {
      const sync = function (currData) {
        currData._gantt_sync_done = true;
        currData._gantt_prevDatas.forEach((prevData) => {
          if (prevData._gantt_sync_done !== true) {
            prevCallback(prevData, currData);
            sync(prevData);
          }
        });
        currData._gantt_nextDatas.forEach((nextData) => {
          if (nextData._gantt_sync_done !== true) {
            nextCallback(nextData, currData);
            sync(nextData);
          }
        });
      };
      sync(ganttData);
      this.ganttDataArrs.forEach((ganttDataArr) =>
        ganttDataArr.forEach((ganttData) => {
          ganttData["_gantt_sync_done"] = false;
        })
      );
    },
    /**
     * 将相关的滑动条进行相同长度的移动
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} interval 移动的长度
     */
    syncIntervalInConnectedGanttData(ganttData, interval) {
      this.sync(
        ganttData,
        (prevData) => {
          this.moveSliderByTranslateX(prevData, interval);
        },
        (nextData) => {
          this.moveSliderByTranslateX(nextData, interval);
        }
      );
    },
    /**
     * 设置ganttData的hover状态
     * @param {Object} ganttData ganttData对象
     * @param {Boolean} isHover isHover的值
     */
    setGanttDataHover(ganttData, isHover) {
      if (ganttData) {
        this.$set(ganttData, "isHover", !!isHover);
        this.sync(
          ganttData,
          (prevData) => {
            this.$set(prevData, "isRelated", isHover);
          },
          (nextData) => {
            this.$set(nextData, "isRelated", isHover);
          }
        );
      }
    },
    /**
     * 根据rowBindType计算ganttData前置(或后置)的ganttData的开始(或结束)时间
     * @param {Object} ganttData ganttData对象， dataModule.records中的一个元素， 组件还添加了部分属性在元素内
     * @param {Number} direction 方向: 0为prev, 1为next
     * @param {Number} rowBindType 滑块之间的绑定模式
     * @returns {Object} 返回的对象包括两个字段: {field: 时间值类型(开始时间 || 结束时间), value: 时间值}
     */
    getBindedGanttDataTime(
      ganttData,
      direction,
      rowBindType = this.rowBindType
    ) {
      let value, field;
      switch (direction) {
        case 0: {
          switch (rowBindType) {
            case RowBindTypeEnum.NotRelated.value: {
              break;
            }
            // 同时开始
            case RowBindTypeEnum.StartAtSameTime.value: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeStart;

              break;
            }
            // 同时结束
            case RowBindTypeEnum.EndAtSameTime.value: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeEnd;

              break;
            }
            // 前结束后开始
            case RowBindTypeEnum.StartAfterPrevEnd.value: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeStart;

              break;
            }
          }
          break;
        }
        case 1: {
          switch (rowBindType) {
            case RowBindTypeEnum.NotRelated.value: {
              break;
            }
            // 同时开始
            case RowBindTypeEnum.StartAtSameTime.value: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeStart;

              break;
            }
            // 同时结束
            case RowBindTypeEnum.EndAtSameTime.value: {
              field = "_gantt_timeEnd";
              value = ganttData._gantt_timeEnd;

              break;
            }
            // 前结束后开始
            case RowBindTypeEnum.StartAfterPrevEnd.value: {
              field = "_gantt_timeStart";
              value = ganttData._gantt_timeEnd;

              break;
            }
          }
          break;
        }
      }
      return { field, value };
    },
    /**
     * 根据时间列的宽度,计算得出时间对应的translateX
     * @param {Date} time 要计算的日期对象
     * @param {Array} timeInfos 时间列对象的数组
     */
    getTranslateXByTime(time, timeInfos = this.columnInfos) {
      const timeTick = time.getTime();
      const firstInfo = timeInfos[0];
      const lastInfo = timeInfos.slice(-1)[0];
      if (timeTick < firstInfo.tick.time) {
        return formatNumber(
          0 +
            (getTimeDiffBetweenTwoTime(timeTick, firstInfo.tick.time) /
              (this.dateTypeHandler.unitTime * 1000)) *
              this.tickUnitWidth
        );
      } else if (timeTick > lastInfo.tick.timeEnd) {
        return formatNumber(
          lastInfo.translateX +
            (getTimeDiffBetweenTwoTime(timeTick, lastInfo.tick.time) /
              (this.dateTypeHandler.unitTime * 1000)) *
              this.tickUnitWidth
        );
      } else {
        // 二分法查找
        while (timeInfos.length > 0) {
          const middleIndex = Math.floor(timeInfos.length / 2);
          const middleInfo = timeInfos[middleIndex];
          if (timeTick >= middleInfo.tick.time) {
            if (timeTick <= middleInfo.tick.timeEnd) {
              return formatNumber(
                middleInfo.translateX +
                  (getTimeDiffBetweenTwoTime(time, middleInfo.tick.time) /
                    (middleInfo.tick.dateTypeHandler.unitTime * 1000)) *
                    middleInfo.width
              );
            } else {
              timeInfos = timeInfos.slice(middleIndex + 1);
            }
          } else {
            timeInfos = timeInfos.slice(0, middleIndex);
          }
        }
      }
    },
    /**
     * 根据时间列的宽度,计算得出translateX对应的时间
     * @param {Number} translateX 位移值
     * @param {Array} timeInfos 时间列对象的数组
     */
    getTimeBytranslateX(translateX, timeInfos = this.columnInfos) {
      const firstInfo = timeInfos[0];
      const lastInfo = timeInfos.slice(-1)[0];
      if (translateX < 0) {
        return new Date(
          this.dateTypeHandler.getSecondPerPx(this.tickUnitWidth) *
            translateX *
            1000 +
            firstInfo.tick.time
        );
      } else if (translateX > lastInfo.translateX) {
        return new Date(
          this.dateTypeHandler.getSecondPerPx(this.tickUnitWidth) *
            (translateX - lastInfo.translateX) *
            1000 +
            lastInfo.tick.time
        );
      } else {
        // 二分法查找
        while (timeInfos.length > 0) {
          const middleIndex = Math.floor(timeInfos.length / 2);
          const middleInfo = timeInfos[middleIndex];
          const transDiff = translateX - middleInfo.translateX;
          if (transDiff >= 0) {
            if (transDiff <= middleInfo.width) {
              return new Date(
                transDiff *
                  this.dateTypeHandler.getSecondPerPx(middleInfo.width) *
                  1000 +
                  middleInfo.tick.time
              );
            } else {
              timeInfos = timeInfos.slice(middleIndex + 1);
            }
          } else {
            timeInfos = timeInfos.slice(0, middleIndex);
          }
        }
      }
    },
    /**
     * 获取translateX相近的整点时间，没有获取到时返回null
     * @param {Number} translateX 位移值
     */
    getMagneticTimeByTranslateX(translateX) {
      if (!this.isMagnetEnabled) {
        return null;
      }
      let timeInfos = this.columnInfos;
      const firstInfo = timeInfos[0];
      const lastInfo = timeInfos.slice(-1)[0];
      if (translateX < 0) {
        return new Date(firstInfo.tick.time);
      } else if (translateX > lastInfo.translateX + lastInfo.width) {
        return new Date(lastInfo.tick.time);
      } else {
        // 二分法查找
        while (timeInfos.length > 0) {
          const middleIndex = Math.floor(timeInfos.length / 2);
          const middleInfo = timeInfos[middleIndex];
          const transDiff = translateX - middleInfo.translateX;
          if (transDiff >= 0) {
            if (transDiff <= middleInfo.width) {
              const ratio = transDiff / middleInfo.width;
              if (ratio <= this.errPer) {
                return new Date(middleInfo.tick.time);
              } else if (ratio >= 1 - this.errPer) {
                return new Date(middleInfo.tick.timeEnd);
              } else {
                return null;
              }
            } else {
              timeInfos = timeInfos.slice(middleIndex + 1);
            }
          } else {
            timeInfos = timeInfos.slice(0, middleIndex);
          }
        }
      }
    },
  },
  beforeDestroy() {
    this.mouseMoveTimer && clearTimeout(this.mouseMoveTimer);
  },
};
</script>

<style lang="scss">
$gantt_height: 32px;
$border_color: #a9a9a9;
$gantt_time_height: 30px;
$background-gray: #d7d7d74a;
@mixin setTransition($property) {
  transition: $property ease-out 0.8s;
}
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
  .gantt_wrapper {
    position: relative;
    overflow: auto;
    display: flex;
  }
  .gantt_time_control_container {
    margin-top: $gantt_time_height;
    .gantt_time_control_rows {
      @include setTransition(height);
      min-height: $gantt_height;
      overflow: hidden;
      &:nth-child(even) {
        background: $background-gray;
      }
      .gantt_time_control_row {
        height: $gantt_height;
        display: flex;
      }
    }
  }
  .gantt_time_container {
    display: flex;
    .gantt_time {
      height: $gantt_time_height;
      flex-shrink: 0;
      background: radial-gradient(#2f83ff 80%, #428efea1);
      border: #cce1ffa1 solid 1px;
      box-sizing: border-box;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  .gantt_row_container {
    @include setTransition(left);
    display: inline-block;
    box-sizing: content-box;
  }
  .gantt_row {
    @include setTransition(height);
    width: 100%;
    display: flex;
    min-height: $gantt_height;
    border-left: 1px solid #67676767;
    background: linear-gradient(90deg, transparent 59px, #676767 60px) repeat-x;
    background-size: 60px 100%;
    &:nth-child(even) {
      background: linear-gradient(90deg, $background-gray 59px, #676767 60px)
        repeat-x;
      background-size: 60px 100%;
    }
    .gantt_content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      background: linear-gradient(180deg, transparent 31px, #676767 1px);
      background-size: 100% 32px;
      overflow: hidden;

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
        @include setTransition(transform);
        @include setBgColor(#6ec8ec);
        height: $gantt_height;
        position: relative;
        transform-origin: left;
        &.moved {
          @include setBgColor(#ff9b58);
        }
        &.unabled {
          @include setBgColor(#c1c1c173);
        }
        &.related {
          @include setBgColor(#e8eb4b);
        }
        .gantt_slider,
        .gantt_unit_text {
          cursor: pointer;
        }
        .gantt_slider {
          @include setTransition(all);
          width: 100px;
          height: 100%;
          transform-origin: left;
          box-sizing: border-box;
        }
        .gantt_sign {
          @include setTransition(transform);
          width: 2px;
          height: 100%;
          box-sizing: border-box;
          background: #bae1f0;
          opacity: 1;
          z-index: 1;
          position: absolute;
          top: 0;
          cursor: w-resize;
          &.left_sign {
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
          transform: translate3d(12px, -50%, 0);
          font-weight: bolder;
        }
      }
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
