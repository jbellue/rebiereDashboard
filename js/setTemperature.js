var myApp = myApp || {};
myApp.setTemperature = (selector, value) => {
    const elem = document.getElementById(selector);
    elem.innerHTML = value
    chromaScale = chroma
        .scale('RdYlBu')
        .domain([45, -30])
        .mode("lab")
    elem.style.color = chromaScale(value).hex();
}