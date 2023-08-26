import Chart from './js/chart.js';
import * as utils from './js/utils.js';
my.utils = utils;

d3.json('./res.json')
    .then(data => {
        my.data = data;

        /*初始化宽高*/
        const container = d3.select("#chart");
        //const [width, height] = ['width', 'height'].map(e => parseInt(ct.style(e)))
        //const [width, height] = [1628, 900];
        let { innerWidth: width, innerHeight: height } = window;

        d3.select("#chart-style")
            .attr("href", "./css/styles/soft/chart.css");

        // 自适应窗口大小
        const w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        my.chart = new Chart(container, data, { showExtraneous: false });

        function updateWindow(){
            width = w.innerWidth || e.clientWidth || g.clientWidth;
            height = w.innerHeight|| e.clientHeight|| g.clientHeight;
        
            my.chart.resize(width, height);
        }
        d3.select(window).on('resize.updatesvg', updateWindow);

        
    })