import { DateEnum } from "./constant.js";
import { isNullOrEmpty } from "./util";
const DateObj = {
  /**
   *
   * @param {Date} dateTime
   * @param {Number} formatType
   * @returns
   */
  formatDateTime: function (dateTime, formatType = DateEnum.DateTime.value) {
    let format;

    switch (formatType) {
      case DateEnum.Date.value: {
        format = "yyyy-MM-dd";
        break;
      }
      case DateEnum.DateTime.value: {
        format = "yyyy-MM-dd hh:mm:ss";
        break;
      }
      default: {
        format = "yyyy-MM-dd hh:mm:ss";
      }
    }
    const _data = {
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1,
      day: dateTime.getDate(),
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      second: dateTime.getSeconds(),
    };
    let res = format;
    res = res.replace(/yy+/g, _data.year);
    res = res.replace(/MM+/g, `${_data.month}`.padStart(2, 0));
    res = res.replace(/dd+/g, `${_data.day}`.padStart(2, 0));
    res = res.replace(/hh+/g, `${_data.hour}`.padStart(2, 0));
    res = res.replace(/mm+/g, `${_data.minute}`.padStart(2, 0));
    res = res.replace(/ss+/g, `${_data.second}`.padStart(2, 0));
    return res;
  },
  stringToDateTime(string) {
    return new Date(string);
  },
};

const numberObj = {
  mul(arg1, arg2) {
    var m = 0,
      s1 = arg1.toString(),
      s2 = arg2.toString();

    try {
      m += s1.split(".")[1].length;
    } catch (e) {
      m += 0;
    }

    try {
      m += s2.split(".")[1].length;
    } catch (e) {
      m += 0;
    }

    return (
      (Number(s1.replace(".", "")) * Number(s2.replace(".", ""))) /
      Math.pow(10, m)
    );
  },
  div(arg1, arg2) {
    var t1 = 0,
      t2 = 0,
      r1,
      r2;

    try {
      t1 = arg1.toString().split(".")[1].length;
    } catch (e) {
      t1 = 0;
    }

    try {
      t2 = arg2.toString().split(".")[1].length;
    } catch (e) {
      t2 = 0;
    }

    r1 = Number(arg1.toString().replace(".", ""));
    r2 = Number(arg2.toString().replace(".", ""));
    return this.mul(r1 / r2, Math.pow(10, t2 - t1));
  },
  sub(arg1) {
    var value = 0;
    var maxPoint = 0; // 最长小数位数

    var point;

    for (
      var _len2 = arguments.length,
        args = new Array(_len2 > 1 ? _len2 - 1 : 0),
        _key2 = 1;
      _key2 < _len2;
      _key2++
    ) {
      args[_key2 - 1] = arguments[_key2];
    }

    args.forEach(function (val) {
      try {
        point = val.toString().split(".")[1].length;
      } catch (e) {
        point = 0;
      }

      if (point > maxPoint) {
        maxPoint = point;
      }
    });

    try {
      point = arg1.toString().split(".")[1].length;
    } catch (e) {
      point = 0;
    }

    if (point > maxPoint) {
      maxPoint = point;
    }

    var m = Math.pow(10, maxPoint);
    value = Math.round(arg1 * m);
    args.forEach(function (val) {
      value -= Math.round(val * m);
    });
    return Number(parseFloat((value / m).toFixed(maxPoint)));
  },
  formatNumber(number, round) {
    round = round || { precise: 4 };
    const precise = round.precise || null;
    if (!isNullOrEmpty(precise)) {
      const decimal = String(number).split(".")[1] || "";
      if (decimal.length < precise) {
        return Number(number.toFixed(precise));
      }
    }
    return number;
  },
};
export default { Date: DateObj, Number: numberObj };
