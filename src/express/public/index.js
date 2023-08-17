import Chart from './js/chart.js';
import * as utils from './js/utils.js';
my.utils = utils;

d3.json('./res.json')
    .then(data => {
        my.data = data;

        /*初始化宽高*/
        const ct = d3.select("#chart");
        //const [width, height] = ['width', 'height'].map(e => parseInt(ct.style(e)))
        //const [width, height] = [1628, 900];
        let { innerWidth: width, innerHeight: height } = window;
        
        // 这里我们将svg元素，和子group元素拆分
        const svg = ct
            .append("svg")
            // 设置svg宽高
            // .attr("preserveAspectRatio", "xMidYMid meet")
            // .attr("viewBox", "0 0 400 400");
        svg
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .attr("style", "max-width: 100%; max-height: 100%;");

        // 自适应窗口大小
        const w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0];
        
        function updateWindow(){
            width = w.innerWidth || e.clientWidth || g.clientWidth;
            height = w.innerHeight|| e.clientHeight|| g.clientHeight;
        
            svg.attr("width", width).attr("height", height);
        }
        d3.select(window).on('resize.updatesvg', updateWindow);

        my.chart = new Chart(svg, data, { showExtraneous: false });
    })