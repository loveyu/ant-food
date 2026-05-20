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
   * 计算蚂蚁的下一个点
   */
  get_next: function (ant) {
    var bk = { x: ant.x, y: ant.y };
    if (
      ant.water == 0 &&
      ant.stack_path.length == 0 &&
      ant.fixed_path.length == 0
    ) {
      if (AntFood.water.length > 0 && Math.random() > 0.8) {
        ant.water_after = ant.type;
        ant.type = 1;
        ant.water = -1;
      } else {
        ant.water = AntFood.water_max;
      }
    }
    if (ant.water > 0) {
      --ant.water;
    }
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
    if (ant.queues.length == AntFood.max_queue) {
      ant.queues.shift();
    }
    ant.queues.push({ x: bk.x, y: bk.y });
    return ant;
  },

  /**
   * 开始觅食操作（概率化信息素选择）
   */
  get_search_food: function (ant) {
    ant = AI.save_home_info(ant);
    var nx = 0,
      ny = 0,
      i,
      j,
      x2,
      flag = false;
    var candidates = [];
    for (i = 0 - ant.eye; i <= ant.eye; i++) {
      for (j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        x2 = ny * AntFood.width + nx;
        var xob = { x: nx, y: ny };
        if (
          AI.is_in_food(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_water(xob)
        ) {
          flag = true;
          break;
        }
        if (AntFood.food_map.hasOwnProperty(x2) && AntFood.food_map[x2] > 0.1) {
          if (!AI.is_out_wall(ant, xob) && !AI.is_in_water(xob)) {
            candidates.push({ x: i, y: j, w: AntFood.food_map[x2] });
          }
        }
      }
      if (flag) {
        break;
      }
    }
    if (flag) {
      return AI.set_fixed_food_path(ant, { x: nx, y: ny });
    }
    if (candidates.length > 0) {
      var target = AI.weighted_random(candidates);
      ant.type = 6;
      ant.stack_path = AI.draw_line(
        ant.x + target.x,
        ant.y + target.y,
        ant.x,
        ant.y,
      );
      return AI.get_right_food_road(ant);
    }
    return AI.get_ant_search_rul(ant);
  },

  /**
   * 开始找水（概率化信息素选择）
   */
  search_water: function (ant) {
    ant = AI.save_home_info(ant);
    var nx = 0,
      ny = 0,
      i,
      j,
      x2,
      flag = false,
      xob;
    var candidates = [];
    for (i = 0 - ant.eye; i <= ant.eye; i++) {
      for (j = 0 - ant.eye; j <= ant.eye; j++) {
        if (i == 0 && j == 0) continue;
        nx = ant.x + i;
        ny = ant.y + j;
        xob = { x: nx, y: ny };
        x2 = ny * AntFood.width + nx;
        if (
          AI.is_in_water(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_food(xob)
        ) {
          flag = true;
          break;
        }
        if (
          AntFood.water_map.hasOwnProperty(x2) &&
          AntFood.water_map[x2] > 0.1
        ) {
          if (
            !AI.is_out_wall(ant, xob) &&
            !AI.is_in_food(xob) &&
            !AI.is_in_home(xob)
          ) {
            candidates.push({ x: i, y: j, w: AntFood.water_map[x2] });
          }
        }
      }
      if (flag) {
        break;
      }
    }
    if (flag && ant.water == -1) {
      ant.type = ant.water_after;
      ant.water = AntFood.water_max;
      ant.water_save = true;
      return AI.get_next(ant);
    }
    if (candidates.length > 0) {
      var target = AI.weighted_random(candidates);
      ant.type = 8;
      ant.stack_path = AI.draw_line(
        ant.x + target.x,
        ant.y + target.y,
        ant.x,
        ant.y,
      );
      return AI.find_water_next(ant);
    }
    return (ant = AI.get_ant_search_rul(ant));
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
      ant.queues = [];
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
      ant.c_home = AntFood.c_home;
      ant.c_food = 0;
      ant.water_save = false;
      return AI.get_search_food(ant);
    }
    return ant;
  },

  /**
   * 找到食物后沿栈返回
   */
  find_food_back: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 2;
      return AI.get_back_rule(ant);
    } else {
      ant.type = 5;
      var pop = ant.stack_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
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
   * 回巢（贪心选择 + 排除已走路径，确保可靠导航）
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
            !AI.in_queue(ant.queues, xob) &&
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
    return AI.get_ant_search_rul(ant);
  },

  /**
   * 判断是否在队列之中
   */
  in_queue: function (queue, obj) {
    for (var i in queue) {
      if (queue.hasOwnProperty(i)) {
        if (queue[i].x == obj.x && queue[i].y == obj.y) return true;
      }
    }
    return false;
  },

  /**
   * 随机搜索移动
   */
  get_ant_search_rul: function (ant) {
    var vector = ant.vector;
    var next = AI.vector_set({ vector: vector, x: ant.x, y: ant.y });
    var i = 0;
    while (
      AI.is_out_wall({ x: ant.x, y: ant.y }, { x: next.x, y: next.y }) ||
      AI.in_queue(ant.queues, next) ||
      AI.is_in_water(next) ||
      AI.is_in_food(next)
    ) {
      if (++i > 100) {
        ant.queues = [];
        return ant;
      }
      vector = AI.get_new_vector(ant.vector);
      next = AI.vector_set({ vector: vector, x: ant.x, y: ant.y });
    }
    ant.save = { x: ant.x, y: ant.y };
    ant.vector = AI.random_search_rul(vector);
    ant.x = next.x;
    ant.y = next.y;
    return ant;
  },

  /**
   * 随机调整方向（5%概率）
   */
  random_search_rul: function (x) {
    if (Math.random() < 0.05) {
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
    for (var i in AntFood.wall) {
      if (!AntFood.wall.hasOwnProperty(i)) {
        continue;
      }
      var obj = AntFood.wall[i];
      var status = AI.line_x_node(
        p1,
        p2,
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
      );
      if (status) {
        return true;
      }
    }
    return false;
  },

  /**
   * 判断是否在食物中间
   */
  is_in_food: function (p) {
    for (var i in AntFood.food) {
      if (!AntFood.food.hasOwnProperty(i)) continue;
      if (AI.in_circle(AntFood.food[i], p)) {
        return true;
      }
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
    for (var i in AntFood.water) {
      if (!AntFood.water.hasOwnProperty(i)) continue;
      if (AI.in_circle(AntFood.water[i], p)) {
        return true;
      }
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
   * 信息素蒸发
   */
  sub_info: function () {
    for (var i in AntFood.home_map) {
      if (AntFood.home_map.hasOwnProperty(i)) {
        AntFood.home_map[i] *= 0.999;
      }
    }
    for (i in AntFood.food_map) {
      if (AntFood.food_map.hasOwnProperty(i)) {
        AntFood.food_map[i] *= 0.999;
      }
    }
    for (i in AntFood.water_map) {
      if (AntFood.water_map.hasOwnProperty(i)) {
        AntFood.water_map[i] *= 0.999;
      }
    }
  },

  /**
   * 信息素沉积
   * home信息素：所有状态都沉积（回巢蚂蚁需要它导航）
   * food信���素：仅回程状态(5,2,7)沉积（只有找到食物的蚂蚁才携带食物信息素）
   */
  save_home_info: function (ant) {
    var x = ant.y * AntFood.width + ant.x;
    var now;

    // home信息素：所有状态沉积
    if (ant.c_home > 1) {
      now = AntFood.home_map.hasOwnProperty(x) ? AntFood.home_map[x] : 0;
      if (now < ant.c_home) {
        AntFood.home_map[x] = now + ant.c_home * 0.005;
      }
      ant.c_home *= 0.999;
    }

    // food信息素：仅回程时沉积
    if (ant.c_food > 1) {
      if (ant.type == 5 || ant.type == 2 || ant.type == 7) {
        now = AntFood.food_map.hasOwnProperty(x) ? AntFood.food_map[x] : 0;
        AntFood.food_map[x] = now + ant.c_food * 0.05;
      }
      ant.c_food *= 0.995;
    }

    // 水信息素
    if (ant.water_save) {
      now = AntFood.water_map.hasOwnProperty(x) ? AntFood.water_map[x] : 0;
      if (now < AntFood.water_max) {
        AntFood.water_map[x] = now + ant.water * 0.01;
      }
    }
    return ant;
  },
};
