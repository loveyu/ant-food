/**
 * 蚁群算法模拟测试脚本（基于参考实现 locas-ants）
 */

// ===== 加载算法 =====
var fs = require("fs");
var path = require("path");

// 提供浏览器全局对象的 mock
var window = { matchMedia: function () { return { matches: false, addEventListener: function () {} }; } };
var document = { getElementById: function () { return { getBoundingClientRect: function () { return { width: 800, height: 600 }; }, getContext: function () { return {}; }, addEventListener: function () {} }; }, querySelectorAll: function () { return []; } };
var prompt = function () { return "5"; };
var alert = function () {};
var setTimeout = function (fn) { fn(); };

// 加载源文件
eval(fs.readFileSync(path.join(__dirname, "ai.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "ant.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "main.js"), "utf8"));

// ===== 配置模拟环境 =====
var SIM_WIDTH = 400;
var SIM_HEIGHT = 300;
var NUM_ANTS = 150;
var MAX_STEPS = 5000;

// 三角分布坐标（等边三角形，中心在画布中央）
var cx = SIM_WIDTH / 2;
var cy = SIM_HEIGHT / 2;
var triR = 100;

var homePos = { x: cx, y: cy - triR };
var foodPos = { x: cx + triR * Math.cos(Math.PI / 6), y: cy + triR * Math.sin(Math.PI / 6) };

// ===== 初始化 =====
function setup() {
  AntFood.ant = [];
  AntFood.food = [];
  AntFood.water = [];
  AntFood.cells = {};
  AntFood.counter = 0;
  AntFood.start = false;
  AntFood.width = SIM_WIDTH;
  AntFood.height = SIM_HEIGHT;
  AntFood.ant_number = NUM_ANTS;
  AntFood.dark_mode = false;
  AntFood.frameCount = 0;

  // 新算法参数
  AntFood.gridSize = 4; // 更细的网格
  AntFood.positionMemorySize = 50; // 更长的记忆
  AntFood.communicateInterval = 1;
  AntFood.pheromoneDecayTime = 3000; // 更长的衰减时间
  AntFood.antSightDistance = 50; // 更远的视野

  // 设置巢穴（半径较小便于测试）
  AntFood.home = { x: Math.round(homePos.x), y: Math.round(homePos.y), r: 15 };

  // 初始化边界墙
  AntFood.wall = [];
  Ant.add_wall(0, 0, SIM_WIDTH, 0);
  Ant.add_wall(SIM_WIDTH, 0, SIM_WIDTH, SIM_HEIGHT);
  Ant.add_wall(SIM_WIDTH, SIM_HEIGHT, 0, SIM_HEIGHT);
  Ant.add_wall(0, SIM_HEIGHT, 0, 0);

  // 添加食物
  Ant.add_food(Math.round(foodPos.x), Math.round(foodPos.y), 10);

  // 初始化蚂蚁
  Ant.init_ant();
}

// ===== 统计指标 =====
var stats = {
  steps: 0,
  foundFood: 0,
  returnedHome: 0,
  prevCarrying: {},
  justReturned: {}, // 记录本帧刚回巢的蚂蚁
  // 追踪找不到回家的蚂蚁
  lostAnts: {}, // antIndex -> {stepsWithFood, lastPos, angle}
  MAX_LOST_STEPS: 500, // 超过这个步数还没回家算迷路
  // 追踪特定蚂蚁
  trackedAntInit: undefined,
  trackedAntStartFrame: undefined,
};

function collectStats() {
  var carryingCount = 0;
  var atHomeCount = 0;

  for (var i = 0; i < AntFood.ant.length; i++) {
    var ant = AntFood.ant[i];
    if (ant.carrying) carryingCount++;

    // 检测回巢：检查上帧携带食物、本帧不再携带、且在巢穴内
    var wasCarrying = stats.prevCarrying[i];
    var dx = ant.x - homePos.x;
    var dy = ant.y - homePos.y;
    var distSq = dx * dx + dy * dy;
    var homeR = AntFood.home.r;

    // 如果上帧携带食物且本帧不在携带状态（在巢穴放下食物）
    if (wasCarrying && !ant.carrying && distSq <= homeR * homeR) {
      stats.returnedHome++;
      stats.justReturned[i] = true;
      // 清除迷路记录
      delete stats.lostAnts[i];
    }

    // 记录上帧是否携带食物
    stats.prevCarrying[i] = ant.carrying;

    // 追踪迷路蚂蚁
    if (ant.carrying) {
      if (!stats.lostAnts[i]) {
        stats.lostAnts[i] = { stepsWithFood: 0, startX: ant.x, startY: ant.y, angle: ant.angle };
      }
      stats.lostAnts[i].stepsWithFood++;
      stats.lostAnts[i].lastX = ant.x;
      stats.lostAnts[i].lastY = ant.y;
      stats.lostAnts[i].angle = ant.angle;
      stats.lostAnts[i].distToHome = Math.sqrt(distSq);
    }
  }

  stats.carryingCount = carryingCount;
  stats.atHomeCount = atHomeCount;
}

// 调试：输出迷路蚂蚁信息
function printLostAnts() {
  for (var i in stats.lostAnts) {
    var lost = stats.lostAnts[i];
    if (lost.stepsWithFood > stats.MAX_LOST_STEPS) {
      process.stdout.write("\n[迷路警告] A" + i + " 携带食物" + lost.stepsWithFood + "步仍在外！ " +
        "起点=(" + lost.startX.toFixed(0) + "," + lost.startY.toFixed(0) + ") " +
        "当前位置=(" + lost.lastX.toFixed(0) + "," + lost.lastY.toFixed(0) + ") " +
        "angle=" + (lost.angle * 180 / Math.PI).toFixed(0) + "° " +
        "距家=" + lost.distToHome.toFixed(0));
    }
  }
}

// 追踪食物丢失原因
function trackFoodLoss() {
  var anyAtHome = false;
  for (var i = 0; i < AntFood.ant.length; i++) {
    var ant = AntFood.ant[i];
    var prevCarry = stats.prevCarrying[i] || false;
    // 如果上帧携带食物，本帧不携带，说明食物状态改变了
    if (prevCarry && !ant.carrying) {
      var dx = ant.x - homePos.x;
      var dy = ant.y - homePos.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var homeR = AntFood.home.r;
      // 如果在巢穴内，算成功回巢
      if (dist <= homeR) {
        anyAtHome = true;
        process.stdout.write("\n[成功回巢] A" + i + " pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ") dist=" + dist.toFixed(0));
      } else if (dist <= homeR * 2) {
        process.stdout.write("\n[近巢丢失] A" + i + " pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ") dist=" + dist.toFixed(0));
      }
      // 不输出远距离的丢失消息，减少噪音
    }
    // 如果携带食物且在巢穴内
    if (ant.carrying) {
      var dx2 = ant.x - homePos.x;
      var dy2 = ant.y - homePos.y;
      var dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
      if (dist2 < AntFood.home.r) {
        process.stdout.write("\n[在家且携带] A" + i + " 在巢穴内仍携带食物！pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ")");
      } else if (dist2 < AntFood.home.r * 2) {
        // 在巢穴附近携带食物 - 添加更详细的调试
        // 计算正确的方向
        var hdx = homePos.x - ant.x;
        var hdy = homePos.y - ant.y;
        var hdir;
        if (Math.abs(hdx) < Math.abs(hdy) * 0.5) hdir = hdy > 0 ? 5 : 1;
        else if (Math.abs(hdy) < Math.abs(hdx) * 0.5) hdir = hdx > 0 ? 3 : 7;
        else hdir = hdy > 0 ? (hdx > 0 ? 4 : 6) : (hdx > 0 ? 2 : 8);
        process.stdout.write("\n[近巢携带] A" + i + " pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ") dist=" + dist2.toFixed(0) + " 正确方向=" + hdir);
      }
    }
  }
// 特殊追踪：找一个携带食物的蚂蚁，详细跟踪其移动
  // 追踪第一只找到食物的蚂蚁
  var trackAnt = -1;
  for (var i = 0; i < AntFood.ant.length; i++) {
    var ant = AntFood.ant[i];
    if (ant.carrying && !stats.trackedAntInit) {
      trackAnt = i;
      break;
    }
  }
  // 首次发现携带食物的蚂蚁时记录
  if (trackAnt >= 0 && !stats.trackedAntInit) {
    stats.trackedAntInit = trackAnt;
    stats.trackedAntStartFrame = AntFood.frameCount;
    stats.trackedAntFrames = 0;
  }
  // 追踪这只蚂蚁的移动（前50帧）
  if (stats.trackedAntInit !== undefined && stats.trackedAntFrames < 50) {
    stats.trackedAntFrames++;
    var ant = AntFood.ant[stats.trackedAntInit];
    if (ant) {
      var dx = homePos.x - ant.x;
      var dy = homePos.y - ant.y;
      var dist = Math.sqrt(dx*dx+dy*dy);
      // 检查周围的洞穴信息素
      var gridX = Math.floor(ant.x / 16);
      var gridY = Math.floor(ant.y / 16);
      var nearbyCave = null;
      for (var ddy = -2; ddy <= 2; ddy++) {
        for (var ddx = -2; ddx <= 2; ddx++) {
          var key = (gridY + ddy) * AntFood.width + (gridX + ddx);
          var cell = AntFood.cells[key];
          if (cell && cell.cave) {
            nearbyCave = {x: cell.cave.x, y: cell.cave.y, time: cell.cave.time};
            break;
          }
        }
        if (nearbyCave) break;
      }
      var caveInfo = nearbyCave ? " cave=(" + nearbyCave.x.toFixed(0) + "," + nearbyCave.y.toFixed(0) + ")" : " noCave";
      process.stdout.write("\n[追踪] A" + stats.trackedAntInit + " f=" + AntFood.frameCount + " pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ")" + caveInfo + " dist=" + dist.toFixed(0));
      if (dist <= AntFood.home.r) {
        process.stdout.write(" *** 到家 ***");
      }
    }
  }
  var minDist = 9999;
  var minAnt = -1;
  for (var i = 0; i < AntFood.ant.length; i++) {
    var ant = AntFood.ant[i];
    var dx = ant.x - homePos.x;
    var dy = ant.y - homePos.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < minDist) {
      minDist = dist;
      minAnt = i;
    }
  }
  if (stats.carryingCount > 0 && minAnt >= 0) {
    var ant = AntFood.ant[minAnt];
    var dx = homePos.x - ant.x;
    var dy = homePos.y - ant.y;
    var targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    var targetDir = AI.angle_to_dir(Math.atan2(dy, dx));
    var actualDir = AI.angle_to_dir(ant.angle);
    // 如果距离很近但没到家，详细输出
    if (minDist < AntFood.home.r * 3) {
      var hdir;
      if (Math.abs(dx) < Math.abs(dy) * 0.5) hdir = dy > 0 ? 5 : 1;
      else if (Math.abs(dy) < Math.abs(dx) * 0.5) hdir = dx > 0 ? 3 : 7;
      else hdir = dy > 0 ? (dx > 0 ? 4 : 6) : (dx > 0 ? 2 : 8);
      process.stdout.write("\n[距巢近] A" + minAnt + " dist=" + minDist.toFixed(0) + " pos=(" + ant.x.toFixed(0) + "," + ant.y.toFixed(0) + ") antDir=" + actualDir + " 正确=" + hdir);
    }
  }
}

// 修复：直接计数找到食物
function countFoundFood() {
  var initialFood = 100;
  var currentFood = AntFood.food[0] ? AntFood.food[0].amount : 0;
  var found = initialFood - currentFood;
  return found;
}

// ===== 运行模拟 =====
function runSim() {
  setup();

  var t0 = Date.now();
  var reportInterval = 500;

  for (var step = 1; step <= MAX_STEPS; step++) {
    AntFood.frameCount = step;

    // 计算所有蚂蚁的下一步
    Ant.calc();

    // 定期报告
    if (step % reportInterval === 0) {
      collectStats();
      trackFoodLoss();
      printLostAnts();
      var elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      // 检查所有携带食物的蚂蚁的位置
      var homeR = AntFood.home.r;
      var minDist = 9999;
      for (var i = 0; i < AntFood.ant.length; i++) {
        var a = AntFood.ant[i];
        var dx = a.x - homePos.x;
        var dy = a.y - homePos.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (a.carrying && dist < minDist) {
          minDist = dist;
          if (dist < homeR * 5) {
            process.stdout.write("\n[调试] A" + i + " carrying=" + a.carrying + " pos=(" + a.x.toFixed(0) + "," + a.y.toFixed(0) + ") home=(" + homePos.x + "," + homePos.y + ") dist=" + dist.toFixed(1) + " homeR=" + homeR);
          }
        }
      }
      if (minDist > 1000) {
        minDist = -1;
      }
      if (step % 1000 === 0) {
        console.log(" [minDist=" + minDist.toFixed(0) + "]");
      }

      process.stdout.write(
        "\r[" + step + "/" + MAX_STEPS +
        " | " + elapsed + "s" +
        " | 找食物:" + countFoundFood() +
        " | 回巢:" + stats.returnedHome +
        " | 携带:" + stats.carryingCount +
        " | 食物:" + (AntFood.food[0] ? AntFood.food[0].amount : 0)
      );
    }

    // 所有食物被取完则结束
    if (AntFood.food[0] && AntFood.food[0].amount <= 0) {
      console.log("\n食物已被取完！");
      break;
    }

    // 收敛检测
    if (stats.returnedHome >= 100 && step > 500) {
      console.log("\n算法收敛！");
      break;
    }
  }

  console.log("\n===== 模拟结果 =====");
  console.log("总帧数: " + AntFood.frameCount);
  console.log("累计找到食物: " + countFoundFood());
  console.log("累计成功回巢: " + stats.returnedHome);
  console.log("食物剩余: " + (AntFood.food[0] ? AntFood.food[0].amount : 0));

  if (countFoundFood() > 0 && stats.returnedHome > 0) {
    console.log("\n结论: 算法正常工作");
  } else if (countFoundFood() > 0) {
    console.log("\n结论: 找到食物但未成功回巢");
  } else {
    console.log("\n结论: 算法存在问题");
  }
}

runSim();