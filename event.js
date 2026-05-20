var AntEvent = {
	/**
	 * 上次点击位子
	 */
	last: {x: -1, y: -1},

	/**
	 * 操作类型，0无操作，1画墙，2画食物，3画水
	 * {number}
	 */
	type: 0,

	/**
	 * 获取鼠标点击的位置
	 * @param {MouseEvent}  evt
	 * @returns {{x: number, y: number}}
	 */
	get_position: function (evt) {
		var obj = AntFood.doc;
		var top = 0;
		var left = 0;
		while (obj && obj.tagName != 'BODY') {
			top += obj.offsetTop;
			left += obj.offsetLeft;
			obj = obj.offsetParent;
		}

		// 返回鼠标相对位置
		var mouseX = evt.clientX - left + window.pageXOffset;
		var mouseY = evt.clientY - top + window.pageYOffset;
		return {
			x: mouseX, y: mouseY
		};
	},

	/**
	 * 鼠标点击事件
	 * @param {MouseEvent} ev
	 */
	click_event: function (ev) {
		var pos = AntEvent.get_position(ev);
		var r;
		switch (AntEvent.type) {
			case 0:
				//确定巢穴
				r = 0;
				do {
					r = parseInt(prompt("巢穴半径(" + pos.x + "," + pos.y + ")", "5"));
					if (isNaN(r))return;
				} while (r < 1);
				AntFood.home.r = r;
				AntFood.home.x = pos.x;
				AntFood.home.y = pos.y;

				do {
					r = parseInt(prompt("蚂蚁数量", "200"));
					if (isNaN(r))return;
				} while (r < 1);
				AntFood.ant_number = r;
				init();
				AntEvent.type = -2;//只允许设置一次
				break;
			case 1:
				//画墙
				if (AntEvent.last.x < 0) {
					AntEvent.last = pos;
				} else {
					Ant.add_wall(AntEvent.last.x, AntEvent.last.y, pos.x, pos.y);
					AntEvent.last = {x: -1, y: -1};
				}
				break;
			case 2:
				//画食物
				r = 0;
				do {
					r = parseInt(prompt("食物半径(" + pos.x + "," + pos.y + ")", "4"));
					if (isNaN(r))return;
				} while (r < 1);
				Ant.add_food(pos.x, pos.y, r);
				break;
			case 3:
				//画食物
				r = 0;
				do {
					r = parseInt(prompt("水源半径(" + pos.x + "," + pos.y + ")", "15"));
					if (isNaN(r))return;
				} while (r < 1);
				Ant.add_water(pos.x, pos.y, r);
				break;
				break;
			default :
				alert("选择操作类型");
				console.log("选择操作类型！");
		}
		if (!AntFood.start) {
			run(false);
		}
	},

	/**
	 * 画墙事件
	 * @param {MouseEvent} obj
	 */
	click_d_wall: function (obj) {
		AntEvent.click_d_clear(obj);
		obj.srcElement.className = "now";
		AntEvent.type = 1;
		return false;
	},

	/**
	 * 画食物事件
	 * @param {MouseEvent} obj
	 */
	click_d_food: function (obj) {
		AntEvent.click_d_clear(obj);
		obj.srcElement.className = "now";
		AntEvent.type = 2;
		return false;
	},

	/**
	 * 画水事件
	 * @param {MouseEvent} obj
	 */
	click_d_water: function (obj) {
		AntEvent.click_d_clear(obj);
		obj.srcElement.className = "now";
		AntEvent.type = 3;
		return false;
	},

	/**
	 * 清除对象
	 * @param {MouseEvent} obj
	 */
	click_d_clear: function (obj) {
		var x = document.querySelectorAll("#d_action button");
		for (var i = 0; i < x.length; i++) {
			x[i].className = "";
		}
		AntEvent.type = 0;
		return false;
	},

	/**
	 * 启动仿真
	 * @param {MouseEvent} obj
	 */
	click_s_start: function (obj) {
		if (AntEvent.type == 0) {
			alert("请先点击任意位置，设置初始信息");
			return false;
		}
		AntFood.start = true;
		AntFood.timer = setTimeout(run, 100);
		AntEvent.type = -1;
		return false;
	},

	/**
	 * 暂停仿真
	 * @param {MouseEvent} obj
	 */
	click_s_pause: function (obj) {
		AntFood.start = false;
		return false;
	},

	/**
	 * 重置仿真
	 * @param {MouseEvent} obj
	 */
	click_s_reset: function (obj) {
		AntEvent.click_d_clear(obj);
		AntEvent.type = 0;
		init();
		return false;
	}
};