export class TimerManager {
  private timers: Map<string, number> = new Map();

  /**
   * 设置一个定时器
   * @param name 定时器名称
   * @param callback 回调函数
   * @param delay 延迟时间（毫秒）
   */
  setTimer(name: string, callback: () => void, delay: number): void {
    // 清除已存在的同名定时器
    this.clearTimer(name);
    
    const timerId = window.setTimeout(callback, delay);
    this.timers.set(name, timerId);
  }

  /**
   * 清除指定的定时器
   * @param name 定时器名称
   */
  clearTimer(name: string): void {
    const timerId = this.timers.get(name);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(name);
    }
  }

  /**
   * 清除所有定时器
   */
  clearAllTimers(): void {
    this.timers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.timers.clear();
  }
}