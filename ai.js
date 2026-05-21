var AI = {
  /**
   * 计算方向的反方向（8方向系统：1=N, 2=NE, ..., 8=NW）
   */
  opposite_dir: function (d) {
    return ((d + 3) % 8) + 1;
  },

  /**
   * 按权重概率随机选择一个候选点
   * @param {{x:number, y:number, w:number}[]} candidates
   */
  weighted_random: function (candidates) {
    if (!candidates || candidates.length == 0) return null;
    if (candidates.length == 1) return candidates[0];
    var total = 0;
    for (var k = 0; k < candidates.length; k++) {
      total += candidates[k].w;
    }
    if (total <= 0) return candidates[0];
    var r = Math.random() * total;
    var cumSum = 0;
    for (var k = 0; k < candidates.length; k++) {
      cumSum += candidates[k].w;
      if (r <= cumSum) return candidates[k];
    }
    return candidates[candidates.length - 1];
  },

  /**
   * 根据偏移量计算最近的8方向向量
   */
  dir_to_offset: function (dx, dy) {
    if (dx == 0 && dy == 0) return 1;
    if (Math.abs(dx) > Math.abs(dy) * 2) {
      return dx > 0 ? 3 : 7;
    } else if (Math.abs(dy) > Math.abs(dx) * 2) {
      return dy > 0 ? 5 : 1;
    } else if (dx > 0 && dy > 0) {
      return 4;
    } else if (dx > 0 && dy < 0) {
      return 2;
    } else if (dx < 0 && dy > 0) {
      return 6;
    } else {
      return 8;
    }
  },

  /**
   * 计算蚂蚁的下一个点
   */
  get_next: function (ant) {
    var bk = { x: ant.x, y: ant.y };
    // 仅当地图有水源时才处理找水逻辑
    if (AntFood.water.length > 0) {
      if (
        ant.water == 0 &&
        ant.stack_path.length == 0 &&
        ant.fixed_path.length == 0 &&
        ant.type == 0 &&
        Math.random() < 0.1
      ) {
        ant.water_after = ant.type;
        ant.type = 1;
        ant.water = -1;
      }
      if (ant.water > 0) {
        --ant.water;
      }
    }
    var orig_type = ant.type;
    switch (ant.type) {
      case 0:
        ant = AI.get_search_food(ant);
        break;
      case 1:
        ant = AI.search_water(ant);
        break;
      case 2:
        ant = AI.get_back_rule(ant);
        break;
      case 4:
        ant = AI.get_next_fixed_food(ant);
        break;
      case 5:
        ant = AI.find_food_back(ant);
        break;
      case 6:
        ant = AI.get_right_food_road(ant);
        break;
      case 7:
        ant = AI.get_next_fixed_home(ant);
        break;
      case 8:
        ant = AI.find_water_next(ant);
        break;
      default:
        console.log("AI get_next error!");
    }
    // 外出状态记录路径用于防重复访问
    if (orig_type != 5 && orig_type != 2 && orig_type != 7) {
      if (ant.queues.length == AntFood.max_queue) {
        var removed = ant.queues.shift();
        var rkey = removed.x + "," + removed.y;
        ant.queues_set[rkey]--;
        if (ant.queues_set[rkey] <= 0) delete ant.queues_set[rkey];
      }
      ant.queues.push({ x: bk.x, y: bk.y });
      ant.queues_set[bk.x + "," + bk.y] =
        (ant.queues_set[bk.x + "," + bk.y] || 0) + 1;
    }
    return ant;
  },

  /**
   * 8方向偏移表
   */
  DIR_OFFSETS: [
    null,
    [0, -1], // 1: N
    [1, -1], // 2: NE
    [1, 0], // 3: E
    [1, 1], // 4: SE
    [0, 1], // 5: S
    [-1, 1], // 6: SW
    [-1, 0], // 7: W
    [-1, -1], // 8: NW
  ],

  /**
   * 开始觅食操作（局部梯度上升跟随食物信息素）
   * 先检查8个相邻像素的food信息素（局部梯度上升），
   * 若无相邻信息素，再扩大到视野范围扫描。
   */
  get_search_food: function (ant) {
    ant = AI.save_home_info(ant);
    var x, y, x2, nx, ny, i, j;

    // 第一优先：检查视野范围内是否直接看到食物
    for (i = 0 - ant.eye; i <= ant.eye; i++) {
      for (j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        var xob = { x: nx, y: ny };
        if (
          AI.is_in_food(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_water(xob)
        ) {
          return AI.set_fixed_food_path(ant, xob);
        }
      }
    }

    // 第二优先：8邻居局部梯度上升（精确跟随信息素轨迹）
    var bestDir = 0;
    var bestW = 0;
    for (var d = 1; d <= 8; d++) {
      nx = ant.x + AI.DIR_OFFSETS[d][0];
      ny = ant.y + AI.DIR_OFFSETS[d][1];
      x2 = ny * AntFood.width + nx;
      if (AntFood.food_map.hasOwnProperty(x2) && AntFood.food_map[x2] > bestW) {
        var xob2 = { x: nx, y: ny };
        if (!AI.is_out_wall(ant, xob2) && !AI.is_in_water(xob2)) {
          bestW = AntFood.food_map[x2];
          bestDir = d;
        }
      }
    }

    if (bestDir > 0) {
      ant.vector = bestDir;
      return AI.get_ant_search_rul(ant);
    }

    // 第三优先：扩大视野范围寻找信息素
    var farBest = null;
    var farBestW = 0;
    for (i = 0 - ant.eye; i <= ant.eye; i++) {
      for (j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        x2 = ny * AntFood.width + nx;
        if (
          AntFood.food_map.hasOwnProperty(x2) &&
          AntFood.food_map[x2] > farBestW
        ) {
          var xob3 = { x: nx, y: ny };
          if (!AI.is_out_wall(ant, xob3) && !AI.is_in_water(xob3)) {
            farBestW = AntFood.food_map[x2];
            farBest = { x: i, y: j };
          }
        }
      }
    }

    if (farBest) {
      ant.vector = AI.dir_to_offset(farBest.x, farBest.y);
      return AI.get_ant_search_rul(ant);
    }

    return AI.get_ant_search_rul(ant);
  },

  /**
   * 开始找水（局部梯度上升跟随水信息素）
   */
  search_water: function (ant) {
    ant = AI.save_home_info(ant);
    var nx, ny, x2, xob;

    // 直接检测水源
    for (var i = 0 - ant.eye; i <= ant.eye; i++) {
      for (var j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        xob = { x: nx, y: ny };
        if (
          AI.is_in_water(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_food(xob)
        ) {
          if (ant.water == -1) {
            ant.type = ant.water_after;
            ant.water = AntFood.water_max * 5;
            ant.c_water = AntFood.c_water_max;
            ant.water_save = true;
            return AI.get_next(ant);
          }
        }
      }
    }

    // 8邻居局部梯度上升
    var bestDir = 0;
    var bestW = 0;
    for (var d = 1; d <= 8; d++) {
      nx = ant.x + AI.DIR_OFFSETS[d][0];
      ny = ant.y + AI.DIR_OFFSETS[d][1];
      x2 = ny * AntFood.width + nx;
      if (
        AntFood.water_map.hasOwnProperty(x2) &&
        AntFood.water_map[x2] > bestW
      ) {
        xob = { x: nx, y: ny };
        if (
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_food(xob) &&
          !AI.is_in_home(xob)
        ) {
          bestW = AntFood.water_map[x2];
          bestDir = d;
        }
      }
    }

    if (bestDir > 0) {
      ant.vector = bestDir;
      return AI.get_ant_search_rul(ant);
    }

    return AI.get_ant_search_rul(ant);
  },

  /**
   * 设置蚂蚁的固定觅食路径
   */
  set_fixed_food_path: function (ant, p) {
    ant.type = 4;
    ant.fixed_path = AI.draw_line(p.x, p.y, ant.x, ant.y);
    return AI.get_next_fixed_food(ant);
  },

  /**
   * 沿固定路径走向食物
   */
  get_next_fixed_food: function (ant) {
    if (ant.fixed_path.length > 0) {
      ant = AI.save_home_info(ant);
      var pop = ant.fixed_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
      ant.stack_path.push(pop);
    } else {
      ant.c_food = AntFood.c_food;
      ant.water_save = false;
      return AI.find_food_back(ant);
    }
    return ant;
  },

  /**
   * 设置蚂蚁的固定回巢路径
   */
  set_fixed_food_home: function (ant, p) {
    ant.type = 7;
    ant.fixed_path = AI.draw_line(p.x, p.y, ant.x, ant.y);
    return AI.get_next_fixed_home(ant);
  },

  /**
   * 沿固定路径回巢
   */
  get_next_fixed_home: function (ant) {
    if (ant.fixed_path.length > 0) {
      ant = AI.save_home_info(ant);
      var pop = ant.fixed_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
      ant.stack_path.push(pop);
    } else {
      ant.queues = [];
      ant.queues_set = {};
      ant.c_home = AntFood.c_home;
      ant.c_food = 0;
      ant.c_water = 0;
      ant.water_save = false;
      return AI.get_search_food(ant);
    }
    return ant;
  },

  /**
   * 找到食物后返回：先沿stack_path走出食物区域，再直线朝巢穴前进
   * 沿途沉积食物信息素，形成直接的收敛路径
   */
  find_food_back: function (ant) {
    ant.type = 5;
    // 先沿固定路径走出食物区域
    if (ant.stack_path.length > 0) {
      var pop = ant.stack_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
      return AI.save_home_info(ant);
    }
    // 已到达巢穴 - 移至中心沉积食物信息素再重置
    if (AI.is_in_home(ant)) {
      ant.x = AntFood.home.x;
      ant.y = AntFood.home.y;
      AI.save_home_info(ant);
      ant.queues = [];
      ant.queues_set = {};
      ant.c_home = AntFood.c_home;
      ant.c_food = 0;
      ant.c_water = 0;
      ant.water_save = false;
      ant.type = 0;
      return AI.get_search_food(ant);
    }
    // 直线朝巢穴方向移动，每帧1步
    var dx = AntFood.home.x - ant.x;
    var dy = AntFood.home.y - ant.y;
    ant.vector = AI.dir_to_offset(dx, dy);
    var next = AI.vector_set({ vector: ant.vector, x: ant.x, y: ant.y });
    if (
      !AI.is_out_wall({ x: ant.x, y: ant.y }, next) &&
      !AI.is_in_water(next)
    ) {
      ant.x = next.x;
      ant.y = next.y;
    } else {
      // 障碍阻挡，随机搜索绕行一帧
      return AI.get_ant_search_rul(ant);
    }
    return AI.save_home_info(ant);
  },

  /**
   * 沿水源信息素路径移动
   */
  find_water_next: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 1;
      return AI.search_water(ant);
    } else {
      ant.type = 8;
      var pop = ant.stack_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
    }
    return AI.save_home_info(ant);
  },

  /**
   * 沿食物信息素路径移动
   */
  get_right_food_road: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 0;
      return AI.get_search_food(ant);
    } else {
      ant.type = 6;
      var pop = ant.stack_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
    }
    return AI.save_home_info(ant);
  },

  /**
   * 回巢（贪心选择home信息素，确保可靠导航）
   */
  get_back_rule: function (ant) {
    ant = AI.save_home_info(ant);
    var nx = 0,
      ny = 0,
      mx = 0,
      i,
      j,
      x2,
      flag = false,
      jx,
      jy;
    for (i = 0 - ant.eye; i <= ant.eye; i++) {
      for (j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        x2 = ny * AntFood.width + nx;
        var xob = { x: nx, y: ny };
        if (
          AI.is_in_home(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_food(xob) &&
          !AI.is_in_water(xob)
        ) {
          mx = -1;
          flag = true;
          break;
        }
        if (AntFood.home_map.hasOwnProperty(x2)) {
          if (
            AntFood.home_map[x2] > mx &&
            !AI.is_out_wall({ x: ant.x, y: ant.y }, xob) &&
            !AI.is_in_food(xob) &&
            !AI.is_in_water(xob)
          ) {
            mx = AntFood.home_map[x2];
            jx = i;
            jy = j;
          }
        }
      }
      if (flag) {
        break;
      }
    }
    if (mx == -1) {
      return AI.set_fixed_food_home(ant, { x: nx, y: ny });
    } else if (mx > 0) {
      ant.type = 5;
      ant.stack_path = AI.draw_line(ant.x + jx, ant.y + jy, ant.x, ant.y);
      return AI.find_food_back(ant);
    }
    // 无信息素时将方向指向巢穴，再随机搜索
    var dx = AntFood.home.x - ant.x;
    var dy = AntFood.home.y - ant.y;
    ant.vector = AI.dir_to_offset(dx, dy);
    return AI.get_ant_search_rul(ant);
  },

  /**
   * 判断是否在队列之中（O(1) 哈希查找）
   */
  in_queue: function (ant, obj) {
    return !!(ant.queues_set[obj.x + "," + obj.y]);
  },

  /**
   * 随机搜索移动
   * 修复：随机尝试8次后，系统性枚举全部方向，彻底避免蚂蚁卡在墙边
   */
  get_ant_search_rul: function (ant) {
    var pos = { x: ant.x, y: ant.y };
    var vector = ant.vector;
    var next = AI.vector_set({ vector: vector, x: ant.x, y: ant.y });
    var i = 0;
    while (
      AI.is_out_wall(pos, next) ||
      AI.in_queue(ant, next) ||
      AI.is_in_water(next) ||
      AI.is_in_food(next)
    ) {
      if (++i > 8) {
        // 随机尝试耗尽，清空队列后系统性枚举8个方向
        ant.queues = [];
        ant.queues_set = {};
        var found = false;
        for (var d = 1; d <= 8; d++) {
          var tn = AI.vector_set({ vector: d, x: ant.x, y: ant.y });
          if (
            !AI.is_out_wall(pos, tn) &&
            !AI.is_in_water(tn) &&
            !AI.is_in_food(tn)
          ) {
            vector = d;
            next = tn;
            found = true;
            break;
          }
        }
        if (!found) {
          // 四面全是墙，原地更新方向，下帧再试
          ant.vector = AI.rand(1, 8);
          return ant;
        }
        break;
      }
      vector = AI.get_new_vector(vector);
      next = AI.vector_set({ vector: vector, x: ant.x, y: ant.y });
    }
    ant.save = pos;
    ant.vector = AI.random_search_rul(vector);
    ant.x = next.x;
    ant.y = next.y;
    return ant;
  },

  /**
   * 随机调整方向（5%概率）
   */
  random_search_rul: function (x) {
    if (Math.random() < 0.03) {
      return AI.get_new_vector(x);
    }
    return x;
  },

  /**
   * 取新的方向向量（排除当前和反方向）
   */
  get_new_vector: function (old) {
    var rt = AI.rand(1, 8);
    var opp = AI.opposite_dir(old);
    var attempts = 0;
    while ((rt == old || rt == opp) && attempts < 20) {
      rt = AI.rand(1, 8);
      attempts++;
    }
    return rt;
  },

  /**
   * 标准8方向移动（每方向精确1像素）
   */
  vector_set: function (ant) {
    switch (ant.vector) {
      case 1:
        ant.y--;
        break; // N
      case 2:
        ant.x++;
        ant.y--;
        break; // NE
      case 3:
        ant.x++;
        break; // E
      case 4:
        ant.x++;
        ant.y++;
        break; // SE
      case 5:
        ant.y++;
        break; // S
      case 6:
        ant.x--;
        ant.y++;
        break; // SW
      case 7:
        ant.x--;
        break; // W
      case 8:
        ant.x--;
        ant.y--;
        break; // NW
      default:
    }
    return ant;
  },

  /**
   * 检测是否碰到墙
   */
  is_out_wall: function (p1, p2) {
    for (var i = 0; i < AntFood.wall.length; i++) {
      var obj = AntFood.wall[i];
      if (
        AI.line_x_node(
          p1,
          p2,
          { x: obj.x1, y: obj.y1 },
          { x: obj.x2, y: obj.y2 },
        )
      ) {
        return true;
      }
    }
    return false;
  },

  /**
   * 判断是否在食物中间
   */
  is_in_food: function (p) {
    for (var i = 0; i < AntFood.food.length; i++) {
      if (AI.in_circle(AntFood.food[i], p)) return true;
    }
    return false;
  },

  /**
   * 判断是否在巢穴
   */
  is_in_home: function (p) {
    return AI.in_circle(AntFood.home, p);
  },

  /**
   * 判断是否在水中
   */
  is_in_water: function (p) {
    for (var i = 0; i < AntFood.water.length; i++) {
      if (AI.in_circle(AntFood.water[i], p)) return true;
    }
    return false;
  },

  /**
   * 判断点是否在圆内
   */
  in_circle: function (circle, p) {
    return (
      (circle.x - p.x) * (circle.x - p.x) +
        (circle.y - p.y) * (circle.y - p.y) <=
      circle.r * circle.r
    );
  },

  /**
   * 判断点P是否在直线p1-p2上
   */
  in_line: function (p1, p2, p) {
    if ((p.x > p1.x && p.x > p2.x) || (p.x < p1.x && p.x < p2.x)) {
      return false;
    }
    return !((p.y > p1.y && p.y > p2.y) || (p.y < p1.y && p.y < p2.y));
  },

  /**
   * 求线段交点
   */
  line_x_node: function (p1, p2, q1, q2) {
    var d1 =
      ((p2.x - p1.x) * (q1.y - p1.y) - (p2.y - p1.y) * (q1.x - p1.x)) *
      ((p2.x - p1.x) * (q2.y - p1.y) - (p2.y - p1.y) * (q2.x - p1.x));
    var d2 =
      ((q2.x - q1.x) * (p1.y - q1.y) - (q2.y - q1.y) * (p1.x - q1.x)) *
      ((q2.x - q1.x) * (p2.y - q1.y) - (q2.y - q1.y) * (p2.x - q1.x));
    return d1 <= 0 && d2 <= 0;
  },

  /**
   * 取一个随机整数
   */
  rand: function (min, max) {
    return parseInt(min + Math.random() * (max - min + 1));
  },

  /**
   * Bresenham画线求两点间所有点
   */
  draw_line: function (x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var ux = ((dx > 0) << 1) - 1;
    var uy = ((dy > 0) << 1) - 1;
    var x = x1,
      y = y1,
      eps;
    var rt = [];
    eps = 0;
    dx = Math.abs(dx);
    dy = Math.abs(dy);
    if (dx > dy) {
      for (x = x1; x != x2; x += ux) {
        rt.push({ x: x, y: y });
        eps += dy;
        if (eps << 1 >= dx) {
          y += uy;
          eps -= dx;
        }
      }
    } else {
      for (y = y1; y != y2; y += uy) {
        rt.push({ x: x, y: y });
        eps += dx;
        if (eps << 1 >= dy) {
          x += ux;
          eps -= dy;
        }
      }
    }
    return rt;
  },

  /**
   * 信息素蒸发（被墙阻断的不可达点加速蒸发）
   */
  sub_info: function () {
    var hx = AntFood.home.x,
      hy = AntFood.home.y;
    var w = AntFood.width;
    for (var i in AntFood.home_map) {
      if (AntFood.home_map.hasOwnProperty(i)) {
        var px = i % w,
          py = (i - px) / w;
        AntFood.home_map[i] *= AI.is_out_wall(
          { x: px, y: py },
          { x: hx, y: hy },
        )
          ? 0.97
          : 0.999;
      }
    }
    for (i in AntFood.food_map) {
      if (AntFood.food_map.hasOwnProperty(i)) {
        px = i % w;
        py = (i - px) / w;
        AntFood.food_map[i] *= AI.is_out_wall(
          { x: px, y: py },
          { x: hx, y: hy },
        )
          ? 0.97
          : 0.999;
      }
    }
    for (i in AntFood.water_map) {
      if (AntFood.water_map.hasOwnProperty(i)) {
        px = i % w;
        py = (i - px) / w;
        AntFood.water_map[i] *= AI.is_out_wall(
          { x: px, y: py },
          { x: hx, y: hy },
        )
          ? 0.97
          : 0.999;
      }
    }
  },

  /**
   * 在指定地图的位置及8邻居沉积信息素（不穿过墙）
   */
  deposit_pheromone: function (map, x, y, amount) {
    var w = AntFood.width,
      h = AntFood.height;
    var key = y * w + x;
    map[key] = (map[key] || 0) + amount;
    var spread = amount * 0.2;
    for (var d = 1; d <= 8; d++) {
      var nx = x + AI.DIR_OFFSETS[d][0];
      var ny = y + AI.DIR_OFFSETS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (AI.is_out_wall({ x: x, y: y }, { x: nx, y: ny })) continue;
      var nk = ny * w + nx;
      map[nk] = (map[nk] || 0) + spread;
    }
  },

  /**
   * 信息素沉积
   * home信息素：所有状态都沉积（回巢蚂蚁需要它导航）
   * food信���素：仅回程状态(5,2,7)沉积（只有找到食物的蚂蚁才携带食物信息素）
   */
  save_home_info: function (ant) {
    var ax = ant.x,
      ay = ant.y;

    // home信息素：仅外出状态沉积（回程不沉积，防止自追踪导致振荡）
    if (ant.c_home > 1) {
      var is_returning = ant.type == 5 || ant.type == 2 || ant.type == 7;
      if (!is_returning) {
        var now = AntFood.home_map[ay * AntFood.width + ax] || 0;
        if (now < ant.c_home) {
          AI.deposit_pheromone(AntFood.home_map, ax, ay, ant.c_home * 0.004);
        }
      }
      ant.c_home *= 0.999;
    }

    // food信息素：仅回程时沉积
    if (ant.c_food > 1) {
      if (ant.type == 5 || ant.type == 2 || ant.type == 7) {
        AI.deposit_pheromone(AntFood.food_map, ax, ay, ant.c_food * 0.008);
      }
      ant.c_food *= 0.999;
    }

    // 水信息素：用c_water浓度替代线性计数器
    if (ant.water_save && ant.c_water > 1) {
      var wnow = AntFood.water_map[ay * AntFood.width + ax] || 0;
      if (wnow < AntFood.c_water_max) {
        AI.deposit_pheromone(AntFood.water_map, ax, ay, ant.c_water * 0.002);
      }
      ant.c_water *= 0.999;
    }
    return ant;
  },
};
