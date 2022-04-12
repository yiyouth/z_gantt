<template>
  <input
    type="datetime-local"
    :value="value"
    @change="onChange($event)"
    class="dateTime"
  />
</template>
<script>
import BaseUtil from "../assets/utils/BaseUtil";
export default {
  name: "Gantt-Calendar",
  props: {
    data: {
      type: Object,
    },
    field: {
      type: String,
    },
  },
  computed: {
    propDateTime: (vm) => vm.data[vm.field],
    value: (vm) => {
      return vm.getFormattedValue(vm.data[vm.field]);
    },
  },
  data() {
    return {};
  },
  methods: {
    onChange(event) {
      const value = event.srcElement.value;
      let newValue, oldValue;
      oldValue = this.data[this.field];
      newValue = BaseUtil.Date.stringToDateTime(value);
      this.data[this.field] = newValue;
      this.$emit("dateTimeChange", this.field, this.data, newValue, oldValue);
    },
    getFormattedValue(date) {
      const dateObj = new Date(date);
      return BaseUtil.Date.formatDateTime(dateObj).replace(
        /^(\d{4}-\d{2}-\d{2}).*?(\d{2}:\d{2}:\d{2})$/,
        "$1T$2"
      );
    },
  },
  created() {},
};
</script>

<style>
.dateTime {
  width: 100%;
  height: 100%;
  border: none;
  background: inherit;
}
</style>
