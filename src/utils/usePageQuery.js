import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { parsePageParam } from "@/utils/pagination";

/**
 * 把列表的「当前第几页」绑到地址栏的 `?page=` 上。
 *
 * 地址是页码的唯一真相源，理由有两个：
 *   1. 刷新、浏览器前进后退、把链接发给别人，落到的都是同一页；
 *   2. 状态只有一份，不会出现「地址写着第 2 页、列表却是第 5 页」这种对不上的情况。
 *
 * blog 与 gallery 两个列表页共用这一份：两边各写一遍的话，任何一边补边界处理
 * 另一边都不会跟着走，而这类缺陷在页面上只表现为「偶尔页码不对」，不容易发现。
 *
 * 另外两种改变页码的来路：
 *   - 用户点页码 / 上下页 → 用 goTo；写地址与取数一起做完，调用方不用再管
 *   - 地址被外部改（后退、前进、粘贴链接）→ 由内部 watch 接住，跟上页码再取数
 *
 * @param {() => void} load 需要重新取数时调用。挂载时不触发 ——
 *                          首次加载由调用方自己决定时机（有的页面要等别的数据齐了再拉）
 */
export function usePageQuery(load) {
  const route = useRoute();
  const router = useRouter();
  const page = ref(parsePageParam(route.query.page));

  /** 地址里 page 参数的原值。vue-router 遇到重复参数会给数组，取第一个 */
  const currentParam = () => {
    const raw = route.query.page;
    return Array.isArray(raw) ? raw[0] : raw;
  };

  /**
   * 第 1 页不写进地址：?page=1 与不带参数是同一个状态，
   * 留着它只会让地址栏多一段没有信息量的尾巴。
   */
  const paramOf = (value) => (value > 1 ? String(value) : undefined);

  const write = (value, replace) => {
    const next = paramOf(value);
    // 地址已经是对的就不发这一次导航：重复导航会被 vue-router 记一条警告，
    // 而且会白白往历史里塞一条同样的记录
    if ((next ?? "") === (currentParam() ?? "")) return;

    const query = { ...route.query };
    if (next == null) delete query.page;
    else query.page = next;
    (replace ? router.replace : router.push)({ query });
  };

  /**
   * 跳到某一页。越界与同值直接忽略。
   *
   * `replace` 用在「自动纠正」上（比如删到最后一条、页码超出范围），
   * 那种跳转不是用户点出来的，不该在历史里留下一条记录让后退键卡住。
   */
  const goTo = (target, { replace = false } = {}) => {
    if (target < 1 || target === page.value) return;
    page.value = target;
    write(target, replace);
    load();
  };

  // 地址被外部改了就跟上。自己 write 出去的那次也会走到这里，但 page 已经改过了，
  // 这一步直接返回 —— 否则一次 goTo 会取两次数。
  watch(currentParam, () => {
    const next = parsePageParam(currentParam());
    if (next === page.value) return;
    page.value = next;
    load();
  });

  return { page, goTo };
}
