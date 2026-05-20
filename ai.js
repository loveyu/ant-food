var AI = {
  /**
   * 计算蚂蚁的下一个点
   */
  get_next: function (ant) {
    var bk = { x: ant.x, y: ant.y };
    if (ant.water == 0 && ant.stack_path.length == 0 && ant.fixed_path == 0) {
      if (Math.random() > 0.5) {
        ant.water_after = ant.type;
        ant.type = 1;
        ant.water = -1;
      } else {
        //针对一部分蚂蚁取消关于水的需求
        ant.water = AntFood.water;
      }
    }
    if (ant.water > 0) {
      --ant.water;
    }
    switch (ant.type) {
      case 0:
        //觅食
        ant = AI.get_search_food(ant);
        break;
      case 1:
        //找水
        ant = AI.search_water(ant);
        break;
      case 2:
        //回巢
        ant = AI.get_back_rule(ant);
        break;
      case 4:
        //固定觅食路径，找到食物
        ant = AI.get_next_fixed_food(ant);
        break;
      case 5:
        //固定回巢路径
        ant = AI.find_food_back(ant);
        break;
      case 6:
        //固定觅食路径，找到合适信息素
        ant = AI.get_right_food_road(ant);
        break;
      case 7:
        //固定的回巢路径
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
   * 开始觅食操作
   * @param ant
   * @returns {*}
   */
  get_search_food: function (ant) {
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
          AI.is_in_food(xob) &&
          !AI.is_out_wall(ant, xob) &&
          !AI.is_in_water(xob)
        ) {
          mx = -1;
          flag = true;
          break;
        }
        if (AntFood.food_map.hasOwnProperty(x2)) {
          if (
            AntFood.food_map[x2] > mx &&
            !AI.in_queue(ant.queues, xob) &&
            !AI.is_out_wall(ant, xob) &&
            !AI.is_in_water(xob)
          ) {
            mx = AntFood.food_map[x2];
            jx = i;
            jy = j;
          }
        }
      }
      if (flag) {
        //找到食物
        break;
      }
    }
    if (mx == 0) {
      //搜索食物失败，规则运动
      return AI.get_ant_search_rul(ant);
    } else if (mx == -1) {
      //找到食物
      return AI.set_fixed_food_path(ant, { x: nx, y: ny });
    } else {
      //找到食物路径
      ant.type = 6;
      ant.stack_path = AI.draw_line(ant.x + jx, ant.y + jy, ant.x, ant.y);
      return AI.get_right_food_road(ant);
    }
  },

  /**
   * 开始找水
   * @param ant
   * @returns {*}
   */
  search_water: function (ant) {
    ant = AI.save_home_info(ant);
    var nx = 0,
      ny = 0,
      i,
      j,
      x2,
      flag = false,
      xob,
      mx = 0,
      jx,
      jy;
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
        if (AntFood.water_map.hasOwnProperty(x2)) {
          if (
            AntFood.water_map[x2] > mx &&
            !AI.in_queue(ant.queues, xob) &&
            !AI.is_out_wall(ant, xob) &&
            !AI.is_in_food(xob) &&
            !AI.is_in_home(xob)
          ) {
            mx = AntFood.water_map[x2];
            jx = i;
            jy = j;
          }
        }
      }
      if (flag) {
        //找到水
        break;
      }
    }
    if (flag && ant.water == -1) {
      ant.type = ant.water_after;
      ant.water = AntFood.water_max;
      ant.water_save = true;
      return AI.get_next(ant);
    } else if (mx > 0) {
      //找到水源路径
      ant.type = 8;
      ant.stack_path = AI.draw_line(ant.x + jx, ant.y + jy, ant.x, ant.y);
      return AI.find_water_next(ant);
    }
    return (ant = AI.get_ant_search_rul(ant));
  },

  /**
   * 设置蚂蚁的固定觅食路径
   * @param ant
   * @param p
   */
  set_fixed_food_path: function (ant, p) {
    ant.type = 4;
    ant.fixed_path = AI.draw_line(p.x, p.y, ant.x, ant.y);
    return AI.get_next_fixed_food(ant);
  },

  /**
   * 返回下一个固定点搜索
   * @param ant
   * @returns {*}
   */
  get_next_fixed_food: function (ant) {
    if (ant.fixed_path.length > 0) {
      //设置信息素
      ant = AI.save_home_info(ant);
      var pop = ant.fixed_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
      ant.stack_path.push(pop);
    } else {
      //清除历史路径
      ant.queues = [];
      ant.c_food = AntFood.c_food;
      ant.water_save = false;
      return AI.find_food_back(ant);
    }
    return ant;
  },

  /**
   * 设置蚂蚁的固定回巢路径
   * @param ant
   * @param p
   */
  set_fixed_food_home: function (ant, p) {
    ant.type = 7;
    ant.fixed_path = AI.draw_line(p.x, p.y, ant.x, ant.y);
    return AI.get_next_fixed_home(ant);
  },

  /**
   * 返回下一个固定点搜索到巢穴
   * @param ant
   * @returns {*}
   */
  get_next_fixed_home: function (ant) {
    if (ant.fixed_path.length > 0) {
      //设置信息素
      ant = AI.save_home_info(ant);
      var pop = ant.fixed_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
      ant.stack_path.push(pop);
    } else {
      //清除历史路径
      ant.queues = [];
      ant.c_home = AntFood.c_home;
      ant.water_save = false;
      return AI.get_search_food(ant);
    }
    return ant;
  },

  /**
   * 找到食物后返回
   */
  find_food_back: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 2;
      //此处在返回规则中设置信息素
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
   * 找到水源路径
   * @param ant
   * @returns {*}
   */
  find_water_next: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 1;
      //此处在返回规则中设置信息素
      return AI.search_water(ant);
    } else {
      ant.type = 8; //继续堆栈寻找
      var pop = ant.stack_path.pop();
      ant.x = pop.x;
      ant.y = pop.y;
    }
    return AI.save_home_info(ant);
  },

  /**
   * 找到合适的路径去食物地点
   * @param ant
   */
  get_right_food_road: function (ant) {
    if (ant.stack_path.length == 0) {
      ant.type = 0;
      //此处在返回规则中设置信息素
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
   * 从环境中获取返回路径
   * @param ant
   * @returns {*}
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
            !AI.in_queue(ant.queues, { x: nx, y: ny }) &&
            !AI.is_out_wall({ x: ant.x, y: ant.y }, xob) &&
            !AI.is_in_food(xob) &&
            !AI.is_in_water(xob)
          ) {
            mx = AntFood.home_map[x2];
            jy = j;
            jx = i;
          }
        }
      }
      if (flag) {
        //找到巢穴
        break;
      }
    }
    if (mx < 0.001 && mx >= 0) {
      //搜索巢穴失败，规则运动
      return AI.get_ant_search_rul(ant);
    } else if (mx == -1) {
      //找到巢穴
      return AI.set_fixed_food_home(ant, { x: nx, y: ny });
    } else {
      //找到巢穴路径
      ant.type = 5;
      ant.stack_path = AI.draw_line(ant.x + jx, ant.y + jy, ant.x, ant.y);
      //不存在小于0的情形
      return AI.find_food_back(ant);
    }
  },

  /**
   * 判断是否在队列之中
   * @param {{x:number,y:number}[]} queue
   * @param {{x:number,y:number}} obj
   * @returns {boolean}
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
   * 简易搜索模式
   * @param ant
   * @returns {*}
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
   * 随机调整关于蚂蚁的方向
   * @param x
   * @returns {*}
   */
  random_search_rul: function (x) {
    if (Math.random() < 0.01) {
      return AI.get_new_vector(x);
    }
    return x;
  },

  /**
   * 取蚂蚁的新的方向向量
   */
  get_new_vector: function (old) {
    var rt = (Math.random() > 0.5 ? 1 : -1) * AI.rand(1, 8);
    while (rt == old || rt + old == 0) {
      rt = (Math.random() > 0.5 ? 1 : -1) * AI.rand(1, 8);
    }
    return rt;
  },

  /**
   * 选择一个方向
   * @param ant
   * @returns {*}
   */
  vector_set: function (ant) {
    switch (ant.vector) {
      case 1:
        --ant.y;
        break;
      case 2:
        ++ant.x;
        ant.y -= 2;
        break;
      case 3:
        ++ant.x;
        --ant.y;
        break;
      case 4:
        ++ant.x;
        break;
      case 5:
        --ant.y;
        ant.x += 2;
        break;
      case 6:
        ++ant.y;
        ant.x += 2;
        break;
      case 7:
        ++ant.x;
        ++ant.y;
        break;
      case 8:
        ant.y += 2;
        ++ant.x;
        break;
      case -1:
        ++ant.y;
        break;
      case -2:
        --ant.x;
        ant.y += 2;
        break;
      case -3:
        --ant.x;
        ++ant.y;
        break;
      case -4:
        --ant.x;
        break;
      case -5:
        ++ant.y;
        ant.x -= 2;
        break;
      case -6:
        --ant.y;
        ant.x -= 2;
        break;
      case -7:
        --ant.x;
        --ant.y;
        break;
      case -8:
        ant.y -= 2;
        --ant.x;
        break;
      default:
    }
    return ant;
  },

  /**
   * 检测是否为不可到的点
   * @param p1 当前点
   * @param p2 目标点
   * @returns {boolean} 有交点返回True
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
   * @param {{x: number, y: number}} p
   * @returns {boolean}
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
   * @param {{x: number, y: number}} p
   * @returns {boolean}
   */
  is_in_home: function (p) {
    return AI.in_circle(AntFood.home, p);
  },

  /**
   * 判断是否在水中
   * @param {{x: number, y: number}} p
   * @returns {boolean}
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
   * @param {{x: number, y: number, r:number}} circle
   * @param {{x: number, y: number}} p
   * @returns {boolean}
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
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @param {{x: number, y: number}} p
   * @returns {boolean}
   */
  in_line: function (p1, p2, p) {
    if ((p.x > p1.x && p.x > p2.x) || (p.x < p1.x && p.x < p2.x)) {
      return false;
    }
    return !((p.y > p1.y && p.y > p2.y) || (p.y < p1.y && p.y < p2.y));
  },

  /**
   * 求交点
   * @returns {boolean} 有交点返回True
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
   * 取一个随机数
   * @param min
   * @param max
   */
  rand: function (min, max) {
    return parseInt(min + Math.random() * (max - min + 1));
  },

  /**
   * 求两点间所有点
   * @param x1 目的X
   * @param y1 目的Y
   * @param x2 源X,不包含
   * @param y2 源Y,不包含
   * @returns {Array}
   */
  draw_line: function (x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var ux = ((dx > 0) << 1) - 1; //x的增量方向，取或-1
    var uy = ((dy > 0) << 1) - 1; //y的增量方向，取或-1
    var x = x1,
      y = y1,
      eps; //eps为累加误差
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
   * 减少信息素
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
   * 开始留下巢穴的信息素
   * @param ant
   */
  save_home_info: function (ant) {
    var x = ant.y * AntFood.width + ant.x;
    var now = 0;

    //找食物，回巢信息
    if (AntFood.home_map.hasOwnProperty(x)) {
      now = AntFood.home_map[x];
    }
    if (now < AntFood.c_home) AntFood.home_map[x] = now + ant.c_home * 0.001;
    ant.c_home *= 0.999;

    now = 0;
    //回巢，食物信息
    if (AntFood.food_map.hasOwnProperty(x)) {
      now = AntFood.food_map[x];
    }
    if (now < AntFood.c_food) AntFood.food_map[x] = now + ant.c_food * 0.01;
    ant.c_food *= 0.99;

    if (ant.water_save) {
      now = 0;
      if (AntFood.water_map.hasOwnProperty(x)) {
        now = AntFood.water_map[x];
      }
      if (now < AntFood.water_max)
        AntFood.water_map[x] = now + ant.water * 0.01;
    }
    return ant;
  },
};
