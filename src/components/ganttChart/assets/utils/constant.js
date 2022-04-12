export const RowBindTypeEnum = {
  NotRelated: { value: -1, text: "断开绑定" },
  StartAtSameTime: { value: 0, text: "同时开始" },
  EndAtSameTime: { value: 1, text: "同时结束" },
  StartAfterPrevEnd: { value: 2, text: "前结束后开始" },
};

export const DateEnum = {
  DateTime: {
    value: 0,
    text: "dateTime",
  },
  Date: {
    value: 1,
    text: "date",
  },
};
