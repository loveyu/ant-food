var AntFood = {
  ant: [], //蚂蚁对象实例
  food: [], //食物
  water: [], //水源
  water_max: 1000, //水的大小
  home_map: [], //回家信息素
  food_map: [], //食物信息素
  water_map: [], //水源信息素
  doc: Object, //文档对象
  canvas: Object, //绘图对象
  width: 400, //宽
  height: 300, //高
  wall: [], //墙的地图,
  counter: 0, //当前计数器
  counter_max: 100, //最大计数器,
  start: false, //是否启动
  max_queue: 300, //最大记忆队列长度
  home: { x: 1, y: 1, r: 2 }, //巢穴路径
  ant_number: 200, //蚂蚁初始数量
  c_home: 1000, //巢穴信息素
  c_food: 1000, //食物信息素
  c_water_max: 1000, //水信息素最大浓度
  dark_mode: false, //暗色主题
};

/**
 * 循环程序
 */
function run(calc) {
  //确定启动程序
  if (typeof calc == "undefined" || calc == true) {
    Ant.calc();
  }
  Ant.init();
  Ant.d_ant();
  if (AntFood.start) {
    if (++AntFood.counter > AntFood.counter_max) {
      AntFood.counter = 0;
      //计算当前信息素
      AI.sub_info();
    }
    AntFood.timer = setTimeout(run, 10);
  }
}

/**
 * 初始化程序
 */
function init() {
  AntFood.ant = [];
  AntFood.food = [];
  AntFood.home_map = [];
  AntFood.food_map = [];
  AntFood.counter = 0;
  AntFood.start = false;
  Ant.init_wall();
  Ant.init_ant();
  AntFood.timer = setTimeout(run, 1);
}

/**
 * 启动函数
 */
function start_ant_food() {
  AntFood.doc = document.getElementById("canvas");
  AntFood.canvas = AntFood.doc.getContext("2d");
  AntFood.doc.addEventListener("click", AntEvent.click_event, false);

  // 移动端触摸支持
  AntFood.doc.addEventListener(
    "touchend",
    function (e) {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        var touch = e.changedTouches[0];
        AntEvent.click_event({
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
      }
    },
    false,
  );

  document
    .getElementById("d_wall")
    .addEventListener("click", AntEvent.click_d_wall, false);
  document
    .getElementById("d_food")
    .addEventListener("click", AntEvent.click_d_food, false);
  document
    .getElementById("d_water")
    .addEventListener("click", AntEvent.click_d_water, false);
  document
    .getElementById("s_start")
    .addEventListener("click", AntEvent.click_s_start, false);
  document
    .getElementById("s_pause")
    .addEventListener("click", AntEvent.click_s_pause, false);
  document
    .getElementById("s_reset")
    .addEventListener("click", AntEvent.click_s_reset, false);
  // 检测暗色主题
  AntFood.dark_mode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // 监听系统主题切换
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function () {
        AntFood.dark_mode = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        Ant.init_dom_color_info("color_list");
      });
  }

  Ant.init_dom_color_info("color_list");

  // 先由CSS布局确定Canvas位置和尺寸，再读取实际像素尺寸初始化
  function resizeCanvas() {
    var canvas = AntFood.doc;
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;

    // 内部缓冲区设为设备像素，确保高清渲染
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // 游戏逻辑使用CSS像素坐标
    AntFood.width = Math.round(rect.width);
    AntFood.height = Math.round(rect.height);

    // 缩放上下文，使绘制坐标对应CSS像素，实际渲染到设备像素
    AntFood.canvas.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", function () {
    resizeCanvas();
    AntFood.wall = [];
    Ant.init_wall();
  });
  resizeCanvas();

  AntFood.ant_number = Math.floor((AntFood.width * AntFood.height) / 2500);

  init();
}
