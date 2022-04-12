import BaseUtil from "./BaseUtil";
export const getDateProxy = function (date, dateTypeHandler) {
  const proxy = new Proxy(new Date(date), {
    get: (obj, prop) => {
      switch (prop) {
        case "dateTypeHandler": {
          return dateTypeHandler;
        }
        case "time": {
          return obj.getTime();
        }
        case "timeEnd": {
          return obj.getTime() + dateTypeHandler.unitTime * 1000;
        }
        case "displayStr": {
          return dateTypeHandler.getTimeColumnName(proxy);
        }
        case "timeStr": {
          return BaseUtil.Date.formatDateTime(obj).replace(
            /^\d{4}-\d{2}-\d{2} (.*?):\d{2}$/,
            "$1"
          );
        }
        case "dateStr": {
          return BaseUtil.Date.formatDateTime(obj, 1);
        }
        case "isRestDay": {
          const day = obj.getDay();
          return day === 6 || day === 0;
        }
        default: {
          const value = obj[prop];
          if (
            Object.prototype.toString.call(obj[prop]).slice(-9, -1) ===
            "Function"
          ) {
            return value.bind(obj);
          } else {
            return value;
          }
        }
      }
    },
  });
  return proxy;
};

class DateTypeBase {
  constructor(timeType) {
    this.timeType = timeType;
    this.unitTime = null;
  }
  /**
   * 一秒代表多少像素
   */
  getSecondPerHour() {
    throw Error("Undefined Function");
  }
  /**
   * 一像素代表多少秒
   */
  getSecondPerPx() {
    throw Error("Undefined Function");
  }
  getTimeColumnName() {
    throw Error("Undefined Function");
  }
  getMagneitcTime() {
    throw Error("Undefined Function");
  }
  getTimeTicks() {
    throw Error("Undefined Function");
  }
}

class DateTypeOfHourHandler extends DateTypeBase {
  constructor() {
    super(0);
    this.unitTime = 60 * 60;
  }
  /**
   * 一秒代表多少像素
   */
  getSecondPerHour(tickUnitWidth) {
    return tickUnitWidth / 3600;
  }
  /**
   * 一像素代表多少秒
   */
  getSecondPerPx(tickUnitWidth) {
    return (1 * 3600) / tickUnitWidth;
  }
  getTimeColumnName(timeTick) {
    return timeTick.timeStr;
  }
  // getMagneticTime(time, unitINRToSeconds, errPer) {
  //     const secondRemainder = time.getMinutes() * 60;
  //     if (secondRemainder <= unitINRToSeconds * errPer) {
  //         time.setMinutes(0, 0, 0);
  //         return time;
  //     } else if (unitINRToSeconds - secondRemainder < unitINRToSeconds * errPer) {
  //         time.setHours(time.getHours() + 1, 0, 0, 0);
  //         return time;
  //     } else {
  //         return null;
  //     }
  // }
  getTimeTicks(startTime, endTime) {
    const ticks = [];
    const endTimeStamp = endTime.getTime();
    let time = new Date(startTime).setMinutes(0, 0, 0);
    while (time < endTimeStamp) {
      const timeProxy = getDateProxy(time, this);
      ticks.push(timeProxy);
      time += this.unitTime * 1000;
    }
    return ticks;
  }
}

class DateTypeOfDayHandler extends DateTypeBase {
  constructor() {
    super(1);
    this.unitTime = 60 * 60 * 24;
  }
  /**
   * 一秒代表多少像素
   */
  getSecondPerHour(tickUnitWidth) {
    return tickUnitWidth / (3600 * 24);
  }
  /**
   * 一像素代表多少秒
   */
  getSecondPerPx(tickUnitWidth) {
    return (1 * 3600 * 24) / tickUnitWidth;
  }
  getTimeColumnName(timeTick) {
    return timeTick.dateStr;
  }
  // getMagneticTime(time, unitINRToSeconds, errPer) {
  //     const secondRemainder = time.getHours() * 60 * 60;
  //     if (secondRemainder <= unitINRToSeconds * errPer) {
  //         time.setHours(0, 0, 0, 0);
  //         return time;
  //     } else if (unitINRToSeconds - secondRemainder < unitINRToSeconds * errPer) {
  //         time.setDate(time.getDate() + 1);
  //         time.setHours(0, 0, 0, 0);
  //         return time;
  //     } else {
  //         return null;
  //     }
  // }
  getTimeTicks(startTime, endTime) {
    const ticks = [];
    const endTimeStamp = endTime.getTime();
    let time = new Date(startTime).setHours(0, 0, 0, 0);
    while (time < endTimeStamp) {
      const timeProxy = getDateProxy(time, this);
      ticks.push(timeProxy);
      time += this.unitTime * 1000;
    }
    return ticks;
  }
}

export const TimeTypeClasses = {
  0: DateTypeOfHourHandler,
  1: DateTypeOfDayHandler,
};

/**
 * 通过开始时间，结束时间。返回时间刻度列表
 * @param {Date} startTime 开始时间
 * @param {Date} endTime 结束时间
 * @param {Number} timeType  刻度类型(日，日期时间)
 * @returns {Array} 时间刻度列表
 */
export const getTimeTicks = function (startTime, endTime, timeType = 0) {
  const ticks = [];
  const endTimeStamp = endTime.getTime();
  switch (timeType) {
    case 0: {
      let time = new Date(startTime).setMinutes(0, 0, 0);
      while (time < endTimeStamp) {
        const ele = new Date(time);
        ele.time = time;
        ele.timeEnd = time + 3600000;
        ele.dateTimeStr = BaseUtil.Date.formatDateTime(ele).replace(
          /^(.*?):\d{2}$/,
          "$1"
        );
        ele.timeStr = BaseUtil.Date.formatDateTime(ele).replace(
          /^\d{4}-\d{2}-\d{2} (.*?):\d{2}$/,
          "$1"
        );
        ele.dateStr = BaseUtil.Date.formatDateTime(ele, 1);
        ticks.push(ele);
        time += 3600000;
      }
      break;
    }
    case 1: {
      let time = new Date(startTime).setHours(0, 0, 0, 0);
      while (time < endTimeStamp) {
        const ele = new Date(time);
        ele.time = time;
        ele.timeEnd = time + 86400000;
        ele.dateTimeStr = BaseUtil.Date.formatDateTime(ele).replace(
          /^(.*?):\d{2}$/,
          "$1"
        );
        ele.timeStr = BaseUtil.Date.formatDateTime(ele).replace(
          /^\d{4}-\d{2}-\d{2} (.*?):\d{2}$/,
          "$1"
        );
        ele.dateStr = BaseUtil.Date.formatDateTime(ele, 1);
        ticks.push(ele);
        time += 86400000;
      }
      break;
    }
  }

  return ticks;
};

/**
 * 获取两个时间点之间的时间段是多少秒
 * @param {Date} startTime  时间段
 * @param {Date} endTime  时间段
 */
export const getSecondsBetweenTwoTimes = function (startTime, endTime) {
  return BaseUtil.Number.div(
    BaseUtil.Number.sub(endTime.getTime(), startTime.getTime()),
    1000
  );
};

export const getTimeDiffBetweenTwoTime = function (timeA, timeB) {
  timeA = timeA instanceof Date ? timeA.getTime() : Number(timeA) || 0;
  timeB = timeB instanceof Date ? timeB.getTime() : Number(timeB) || 0;
  return timeA - timeB;
};

export const getTimeProxy = function (time) {
  return new Proxy(
    { _origin: time instanceof Date ? time : new Date(time) },
    {
      get: function (obj, prop) {
        if (prop === "dateObj") {
          return obj._origin;
        }
        if (prop === "dateString") {
          return obj._origin.toString();
        }
        if (typeof obj._origin[prop] === "function") {
          return obj._origin[prop].bind(obj._origin);
        } else {
          return obj._origin[prop];
        }
      },
      set: function (obj, prop, value) {
        if (prop === "_origin") {
          obj._origin = value instanceof Date ? value : new Date(value);
        } else {
          obj._origin[prop] = value;
        }
      },
    }
  );
};

const msgFunc = function (type, msg) {
  const ele = document.createElement("div");
  ele.className = `gantt_message${type ? " " + type : ""}`;
  ele.textContent = msg;
  ele.style.opacity = 0;
  const bodyEle = document.getElementsByTagName("body")[0];
  bodyEle.appendChild(ele);
  setTimeout(() => {
    ele.style.opacity = 1;
    setTimeout(() => {
      ele.style.opacity = 0;
      setTimeout(() => {
        bodyEle.removeChild(ele);
      }, 1000);
    }, 1000);
  });
};

export const Message = {
  success: msgFunc.bind(this, "success"),
  error: msgFunc.bind(this, "error"),
};

// /**
//  * 获取元素的translateX的值
//  * @param {Element} element
//  * @returns
//  */
//  export const getElementTranslateX = function(element) {
//     return Number(element.style.transform.replace(/^.*translateX\(([-\d\\.]*)px\).*$/g, "$1")) || 0;
// };
// /**
//  * 获取元素的ScaleX的值
//  * @param {Element} element
//  * @returns
//  */
// export const getElementScaleX = function(element) {
//     return Number(element.style.transform.replace(/^.*scaleX\(([-\d\\.]*)\).*$/g, "$1")) || 0;
// };

// export const getTimeStampByPx = function(px, ratio) {
//     return BaseUtil.Number.mul(px, BaseUtil.Number.mul(ratio, 3600000));
// };

export const isNullOrEmpty = function (value) {
  return value === null || value === undefined;
};

export const isObjectContentEqual = function (obj1, obj2) {
  const keys1 = typeof obj1 === "object" ? Object.keys(obj1) : [];
  const keys2 = typeof obj2 === "object" ? Object.keys(obj2) : [];
  if (keys1.length === keys2.length) {
    for (const key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
        return false;
      } else {
        const value1 = obj1[key];
        const value2 = obj2[key];
        if (typeof value1 === "object" && typeof value2 === "object") {
          if (!isObjectContentEqual(value1, value2)) {
            return false;
          }
        } else {
          if (value1 !== value2) {
            if (isNaN(value1) === true && isNaN(value2) === true) {
              continue;
            } else {
              return false;
            }
          }
        }
      }
    }
    return true;
  }
  return false;
};

export const formatNumber = function (number, round) {
  round = round || { precise: 4 };
  return Number(BaseUtil.Number.formatNumber(number, round));
};

export const isTimeColumnField = function (columnField) {
  return columnField.startsWith("_gantt_timeColumn");
};
