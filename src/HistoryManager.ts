
class HistoryManager<T> {
    constructor(maxHistorySize: number = 30) {
        this.maxHistorySize = maxHistorySize;
    }
    
    protected maxHistorySize: number;
    protected history: T[] = [];
    protected historyPtr: T = undefined;
    protected historyForeward: T[] = [];

    public storeInHistory(value: T) {
        this.historyForeward = [];

        if(this.historyPtr) {
            this.history.push(this.historyPtr);
        }
        this.historyPtr = deepClone(value);

        while(this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    public backInHistory(): T {
        if(this.history.length > 0) {

            this.historyForeward.push(this.historyPtr);
            const result = this.history.pop();
            this.historyPtr = deepClone(result);

            return result;
        }
    }

    public forewardInHistory(): T {
        if(this.historyForeward.length > 0) {

            this.history.push(this.historyPtr);
            const result = this.historyForeward.pop();
            this.historyPtr = deepClone(result);

            return result;
        }
    }
}
