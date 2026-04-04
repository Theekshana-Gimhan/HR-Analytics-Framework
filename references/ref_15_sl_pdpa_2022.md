# Reference [15]: Personal Data Protection Act No. 9 of 2022 (Sri Lanka)

### **Core Summary**
This is Sri Lanka's first comprehensive legal framework for data privacy, inspired by the EU's GDPR. It regulates how entities (Controllers) process personal data.

### **Key Provisions for Your Project**
*   **Anonymization (Section 9):** Data must be rendered in a form where the data subject can no longer be identified once the primary purpose (prediction) is fulfilled.
*   **Retention:** Personal data should not be kept longer than necessary for its collected purpose.
*   **Data Subject Rights:**
    *   **Right of Access:** Users can ask what data is being processed.
    *   **Right to Erasure:** Users can request deletion of their data.
    *   **Automated Decision-Making (Section 18):** Individuals have the right to request a human review of decisions made solely by AI (e.g., being flagged as "high risk" for attrition).

### **Defense Tip for Viva**
"My system complies with the SL PDPA No. 9 of 2022 by implementing **Privacy by Design**. Specifically, all PII (Names, NICs) is stripped at the database level before being sent to the AI module, ensuring that the model only processes anonymized behavioral vectors."

*Source Summary: [Parliament of Sri Lanka](https://www.parliament.lk/en/parliamentary-business/acts-of-parliament)*
