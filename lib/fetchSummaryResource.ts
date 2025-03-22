export function createSummaryResource(fetchFunction: () => Promise<any>) {
    let status = "pending";
    let result: any;

    const suspender = fetchFunction().then(
        (res) => {
            status = "success";
            result = res;
        },
        (err) => {
            status = "error";
            result = err;
        }
    );

    return {
        read() {
            if (status === "pending") {
                throw suspender; // Suspends rendering
            } else if (status === "error") {
                throw result; // Throws the error
            } else if (status === "success") {
                return result;
            }
        },
    };
}