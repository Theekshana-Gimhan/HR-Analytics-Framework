# Reference [10]: Employee Turnover Prediction (Punnoose and Ajit, 2016)

### **Research Methodology**
*   **Data Source:** Data from the Human Resource Information Systems (HRIS) of a global retailer.
*   **Problem:** HRIS data is often "noisy" (less accurate than financial systems), making traditional models prone to overfitting.
*   **Approach:** Introduced **Extreme Gradient Boosting (XGBoost)** and compared it against six traditional supervised classifiers (including Random Forest, SVM, and Logistic Regression).
*   **Key Technique:** Used **regularization** within XGBoost to handle data noise and improve generalization.

### **Performance Comparison**
*   **XGBoost:** Achieved significantly higher accuracy than all other classifiers. Its robust regularization effectively managed the inherent noise in HR data.
*   **Random Forest:** While strong, it was **outperformed by XGBoost** in this specific domain of employee turnover.
*   **Business Impact:** High performance allows organizations to move from reactive measures to proactive retention and succession planning.

*Source Summary: [The SAI Organization](https://thesai.org/Publications/ViewPaper?Volume=5&Issue=9&Code=IJARAI&SerialNo=4)*
