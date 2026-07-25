export function getCurrentChinaTime() {
    const date = new Date();

    // 使用 `Intl.DateTimeFormat` 获取中国时区的日期格式
    const chinaTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);

    // 将返回的 `DD/MM/YYYY, hh:mm:ss` 格式处理为 `YYYY-MM-DDThh:mm:ss`
    const [day, month, year, hour, minute, second] = chinaTime.split(/[\s/:,]+/);

    // 生成符合 ISO 8601 格式的字符串
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    console.log(isoString);

    return isoString;
}
