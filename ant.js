var Ant = {
	/**
	 * 初始化画布
	 */
	init: function () {
		var obj = AntFood.canvas;
		obj.clearRect(0, 0, AntFood.width, AntFood.height);
		for (var i in AntFood.wall) {
			if (!AntFood.wall.hasOwnProperty(i)) {
				continue;
			}
			obj.strokeStyle = '#000';
			var x = AntFood.wall[i];
			obj.moveTo(x.x1, x.y1);
			obj.lineTo(x.x2, x.y2);
		}
		obj.stroke();
		if (AntEvent.last.x > 0) {
			Ant.drawP(AntEvent.last.x, AntEvent.last.y, obj);
			obj.stroke();
		}
		Ant.d_food();
		Ant.d_home();
		Ant.d_water();
	},

	/**
	 * 画点
	 * @param x
	 * @param y
	 * @param obj
	 */
	drawP: function (x, y, obj) {
		obj.moveTo(x, y);
		obj.lineTo(x + 1, y + 1);
	},

	/**
	 * 画圆
	 * @param x
	 * @param y
	 * @param r
	 * @param obj
	 */
	drawCircle: function (x, y, r, obj) {
		obj.beginPath();
		obj.arc(x, y, r, 0, Math.PI * 2);
		obj.closePath();
		obj.fill();
		obj.stroke();
	},

	/**
	 * 计算
	 */
	calc: function () {
		for (var i = 0; i < AntFood.ant.length; i++) {
			AntFood.ant[i] = AI.get_next(AntFood.ant[i]);
		}
	},

	/**
	 * 画食物
	 */
	d_food: function () {
		var cxt = AntFood.canvas;
		for (var i = 0; i < AntFood.food.length; i++) {
			var obj = AntFood.food[i];
			Ant.color_select(-2);
			Ant.drawCircle(obj.x, obj.y, obj.r, cxt);
		}
	},

	/**
	 * 画水
	 */
	d_water: function () {
		var cxt = AntFood.canvas;
		for (var i = 0; i < AntFood.water.length; i++) {
			var obj = AntFood.water[i];
			Ant.color_select(-3);
			Ant.drawCircle(obj.x, obj.y, obj.r, cxt);
		}
	},

	/**
	 * 画巢穴
	 */
	d_home: function () {
		Ant.color_select(-1);
		Ant.drawCircle(AntFood.home.x, AntFood.home.y, AntFood.home.r, AntFood.canvas);
	},

	/**
	 * 画蚂蚁
	 */
	d_ant: function () {
		var cxt = AntFood.canvas;
		for (var i = 0; i < AntFood.ant.length; i++) {
			Ant.color_select(AntFood.ant[i].type);
			Ant.drawCircle(AntFood.ant[i].x, AntFood.ant[i].y, 2, cxt);
		}
	},

	/**
	 * 颜色选择器
	 * @param type
	 */
	color_select: function (type) {
		var cxt = AntFood.canvas;
		var rt = "#c06";
		switch (type) {
			case -1:
				rt = '#f0f';
				break;
			case -2:
				rt = '#a90';
				break;
			case -3:
				rt = '#39f';
				break;
			case 0:
				rt = '#000';
				break;
			case 1:
				rt = '#f00';
				break;
			case 2:
				rt = '#063';
				break;
			case 4:
				rt = '#309';
				break;
			case 5:
				rt = '#3f0';
				break;
			case 6:
				rt = '#903';
				break;
			case 7:
				rt = '#00f';
				break;
			case 8:
				rt = '#ff0';
				break;
			default :
				rt = '#c06';
				break;
		}
		cxt.fillStyle = rt;
		cxt.strokeStyle = rt;
		return rt;
	},

	/**
	 * 墙及障碍物初始化
	 */
	init_wall: function () {
		Ant.add_wall(0, 0, AntFood.width, 0);
		Ant.add_wall(AntFood.width, 0, AntFood.width, AntFood.height);
		Ant.add_wall(AntFood.width, AntFood.height, 0, AntFood.height);
		Ant.add_wall(0, AntFood.height, 0, 0);
	},

	/**
	 * 添加墙
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @returns {Number|*}
	 */
	add_wall: function (x1, y1, x2, y2) {
		return AntFood.wall.push({x1: x1, y1: y1, x2: x2, y2: y2});
	},

	/**
	 * 添加水源
	 * @param x
	 * @param y
	 * @param r
	 * @returns {Number|*}
	 */
	add_water: function (x, y, r) {
		return AntFood.water.push({x: x, y: y, r: r});
	},

	/**
	 * 添加食物到地图中
	 * @param x
	 * @param y
	 * @param r 半径
	 * @returns {Number|*}
	 */
	add_food: function (x, y, r) {
		return AntFood.food.push({x: x, y: y, r: r});
	},

	/**
	 * 初始化蚂蚁的信息
	 */
	init_ant: function () {
		for (var i = 0; i < AntFood.ant_number; i++) {
			AntFood.ant[i] = {
				x: AntFood.home.x, y: AntFood.home.y, type: 0, eye: AI.rand(4, 8),//视距
				c_home: AntFood.c_home,//巢穴信息素
				c_food: 0,//食物信息素
				fixed_path: [],//固定路径
				stack_path: [],//堆栈路径
				queues: [],//历史队列
				water: AI.rand(AntFood.water_max / 3, AntFood.water_max),//多少次后改为找水
				water_after: undefined,//找到水之后的状态
				water_save: false,//散布水信息素
				vector: (Math.random() > 0.5 ? 1 : -1) * AI.rand(1, 8)//方向
			};
		}
	},

	/**
	 * 展示关于蚂蚁的颜色信息
	 */
	init_dom_color_info: function (id) {
		var dom = document.getElementById(id);
		var fun = function (tag, cont, color) {
			var para = document.createElement(tag);
			var node = document.createTextNode("●" + cont);
			para.appendChild(node);
			para.style.color = color;
			dom.appendChild(para);
		};
		fun("span", "找食物中", Ant.color_select(0));
		fun("span", "找水中", Ant.color_select(1));
		fun("span", "返回巢穴", Ant.color_select(2));
		fun("span", "固定食物路径", Ant.color_select(4));
		fun("span", "固定回巢路径", Ant.color_select(5));
		fun("span", "固定觅食路径", Ant.color_select(6));
		fun("span", "固定回巢", Ant.color_select(7));
		fun("span", "找到水源路径", Ant.color_select(8));
		fun("span", "巢穴颜色", Ant.color_select(-1));
		fun("span", "食物颜色", Ant.color_select(-2));
		fun("span", "水颜色", Ant.color_select(-3));
	}

};