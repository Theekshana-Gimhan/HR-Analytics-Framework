# Central reference list

**How this works.** Chapters cite by **stable key** — `[@peffers2007]` — never by number.
`scripts/build_dissertation.py` resolves keys to IEEE numbers at build time, assigning
`[1]`, `[2]`, … in **order of first appearance across the assembled document**. This means
P9 can add, remove or reorder references without touching a single in-text citation.

**Rules**
- One entry per key. Keys are `firstauthorYYYY`, lowercase, no punctuation.
- `origin: interim` marks the 21 references already cited in the Interim Report — keep these
  unless P9 explicitly replaces them (the audit flags `charney2024` and `kodakandla2021` as weak,
  and `googlecloud2024vertex` as needing supplement).
- Never cite a key that is not in this file; the build script fails on an unresolved key.
- Target for P9: **40+ entries**. Current count is listed at the bottom.

---

## Sri Lankan context and economy

| Key | Entry | Origin |
|---|---|---|
| `dcs2023` | Department of Census and Statistics, "Sri Lanka Labour Force Survey — Annual Report 2023," Ministry of Finance, Sri Lanka, 2023. | interim |
| `kirupananthan2024` | S. Kirupananthan, M. Kayathiry, and S. Niroshan, "Exploring Challenges for Artificial Intelligence Readiness in SMEs in Sri Lanka," *Vavuniya Journal of Business Management*, vol. 4, no. 1, 2024. | interim |
| `icta2023` | Information and Communication Technology Agency of Sri Lanka (ICTA), "Sri Lanka Digital Economy Report 2023," ICTA, Colombo, 2023. | interim |
| `moth2024` | Ministry of Technology, "Artificial Intelligence in Sri Lanka: White Paper," Government of Sri Lanka, 2024. | interim |
| `slbfe2023` | Sri Lanka Bureau of Foreign Employment, "Annual Statistical Report of Foreign Employment 2023," SLBFE, Colombo, 2023. | interim |
| `pdpa2022` | Parliament of Sri Lanka, "Personal Data Protection Act, No. 9 of 2022," *Government Gazette of the Democratic Socialist Republic of Sri Lanka*, 2022. | interim |

## Turnover, HR analytics and attrition prediction

| Key | Entry | Origin |
|---|---|---|
| `allen2008` | D. G. Allen, *Retaining Talent: A Guide to Analyzing and Managing Employee Turnover*. Alexandria, VA: SHRM, 2008. | interim |
| `griffeth2000` | R. W. Griffeth, P. W. Hom, and S. Gaertner, "A Meta-Analysis of Antecedents and Correlates of Employee Turnover: Update, Moderator Tests, and Research Implications for the Next Millennium," *Journal of Management*, vol. 26, no. 3, pp. 463–488, 2000. | interim |
| `punnoose2016` | R. Punnoose and P. Ajit, "Prediction of Employee Turnover in Organizations using Machine Learning Algorithms," *Int. J. Advanced Research in Artificial Intelligence*, vol. 5, no. 9, pp. 22–26, 2016. | interim |
| `angrave2016` | D. Angrave, A. Charlwood, I. Kirkpatrick, M. Lawrence, and M. Stuart, "HR and Analytics: Why HR is Set to Fail the Big Data Challenge," *Human Resource Management Journal*, vol. 26, no. 1, pp. 1–11, 2016. | interim |
| `kanchana2023` | L. Kanchana and R. Jayathilaka, "Factors impacting employee turnover intentions among professionals in Sri Lankan startups," *PLOS ONE*, vol. 18, no. 2, e0281729, 2023, doi: 10.1371/journal.pone.0281729. | interim |
| `li2023` | W. Li, "A transformer-based deep learning framework to predict employee attrition," *PeerJ Computer Science*, vol. 9, e1570, 2023, doi: 10.7717/peerj-cs.1570. | **new — Ch2 §2.1/§2.3** |
| `pavithran2025` | M. S. Pavithran and S. M. Vadivel, "Explainable attrition risk scoring for managerial retention decisions in human resource analytics," *Frontiers in Big Data*, vol. 8, 1699561, 2025, doi: 10.3389/fdata.2025.1699561. | **new — Ch2 §2.1/§2.3** |
| `mohiuddin2023` | K. Mohiuddin, M. A. Alam, M. M. Alam, P. Welke, M. Martin, J. Lehmann, and S. Vahdati, "Retention Is All You Need," arXiv:2304.03103, 2023. | **new — Ch2 §2.2** |
| `ilyas2026` | M. Ilyas, W. Alam, and A. Ahmad, "Breaking barriers: driving HR analytics adoption in small and medium-sized enterprises," *Evidence-based HRM: a Global Forum for Empirical Scholarship*, vol. 14, no. 1, pp. 171–191, 2026, doi: 10.1108/EBHRM-01-2024-0015. | **new — Ch2 §2.5** |
| `bahanni2026` | K. Bahanni, Y. Fujimoto, and E. E. T. Bolt, "Contextual challenges in HR analytics adoption: an open systems perspective from HR managers in a developing country," *Personnel Review*, vol. 55, no. 2, pp. 578–598, 2026, doi: 10.1108/PR-04-2024-0375. | **new — Ch2 §2.5** |

## Turnover theory, intention and cross-cultural variation

| Key | Entry | Origin |
|---|---|---|
| `mobley1977` | W. H. Mobley, "Intermediate linkages in the relationship between job satisfaction and employee turnover," *Journal of Applied Psychology*, vol. 62, no. 2, pp. 237–240, 1977. | **new — Ch2 §2.6** |
| `steel1984` | R. P. Steel and N. K. Ovalle, "A review and meta-analysis of research on the relationship between behavioral intentions and employee turnover," *Journal of Applied Psychology*, vol. 69, no. 4, pp. 673–686, 1984. | **new — Ch2 §2.6** |
| `ajzen1991` | I. Ajzen, "The theory of planned behavior," *Organizational Behavior and Human Decision Processes*, vol. 50, no. 2, pp. 179–211, 1991. | **new — Ch2 §2.6** |
| `fischer2009` | R. Fischer and A. Mansell, "Commitment across cultures: A meta-analytical approach," *Journal of International Business Studies*, vol. 40, no. 8, pp. 1339–1358, 2009, doi: 10.1057/jibs.2009.14. | **new — Ch2 §2.3** |

## Machine learning method

| Key | Entry | Origin |
|---|---|---|
| `sarker2021` | I. H. Sarker, "Machine Learning: Algorithms, Real-World Applications and Research Directions," *SN Computer Science*, vol. 2, no. 3, pp. 1–21, 2021. | interim |
| `breiman2001` | L. Breiman, "Random Forests," *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001. | **new — Ch3** |
| `chawla2002` | N. V. Chawla, K. W. Bowyer, L. O. Hall, and W. P. Kegelmeyer, "SMOTE: Synthetic Minority Over-sampling Technique," *Journal of Artificial Intelligence Research*, vol. 16, pp. 321–357, 2002. | interim |
| `batista2004` | G. E. A. P. A. Batista, R. C. Prati, and M. C. Monard, "A Study of the Behavior of Several Methods for Balancing Machine Learning Training Data," *ACM SIGKDD Explorations Newsletter*, vol. 6, no. 1, pp. 20–29, 2004. | **new — Ch3** |
| `efron1993` | B. Efron and R. J. Tibshirani, *An Introduction to the Bootstrap*. New York: Chapman & Hall, 1993. | **new — Ch3** |
| `morenotorres2012` | J. G. Moreno-Torres, T. Raeder, R. Alaiz-Rodríguez, N. V. Chawla, and F. Herrera, "A unifying view on dataset shift in classification," *Pattern Recognition*, vol. 45, no. 1, pp. 521–530, 2012, doi: 10.1016/j.patcog.2011.06.019. | **new — Ch2 §2.3** |
| `ibm2017` | IBM, "IBM HR Analytics Employee Attrition & Performance Dataset," Kaggle, 2017. | interim |

## Explainable AI

| Key | Entry | Origin |
|---|---|---|
| `lundberg2017` | S. M. Lundberg and S.-I. Lee, "A Unified Approach to Interpreting Model Predictions," in *Advances in Neural Information Processing Systems (NeurIPS)*, 2017, pp. 4765–4774. | interim |
| `lundberg2020` | S. M. Lundberg et al., "From local explanations to global understanding with explainable AI for trees," *Nature Machine Intelligence*, vol. 2, pp. 56–67, 2020, doi: 10.1038/s42256-019-0138-9. | **new — Ch2 §2.2** |
| `rudin2019` | C. Rudin, "Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead," *Nature Machine Intelligence*, vol. 1, pp. 206–215, 2019. | **new — Ch2 §2.2** |

## Research methodology

| Key | Entry | Origin |
|---|---|---|
| `hevner2004` | A. R. Hevner, S. T. March, J. Park, and S. Ram, "Design Science in Information Systems Research," *MIS Quarterly*, vol. 28, no. 1, pp. 75–105, 2004. | interim |
| `peffers2007` | K. Peffers, T. Tuunanen, M. A. Rothenberger, and S. Chatterjee, "A Design Science Research Methodology for Information Systems Research," *Journal of Management Information Systems*, vol. 24, no. 3, pp. 45–77, 2007. | **new — Ch3** |
| `podsakoff2003` | P. M. Podsakoff, S. B. MacKenzie, J.-Y. Lee, and N. P. Podsakoff, "Common Method Biases in Behavioral Research: A Critical Review of the Literature and Recommended Remedies," *Journal of Applied Psychology*, vol. 88, no. 5, pp. 879–903, 2003. | **new — Ch3/Ch5** |

## Cloud, serverless and cost

| Key | Entry | Origin |
|---|---|---|
| `ribeiro2015` | M. Ribeiro, K. Grolinger, and M. A. M. Capretz, "MLaaS: Machine Learning as a Service," in *Proc. IEEE ICMLA*, 2015, pp. 896–902. | interim |
| `adzic2017` | G. Adzic and R. Chatley, "Serverless computing: economic and architectural impact," in *Proc. 11th Joint Meeting on Foundations of Software Engineering (ESEC/FSE)*, Paderborn, Germany, 2017, pp. 884–889, doi: 10.1145/3106237.3117767. | **new — Ch2 §2.4; replaces `kodakandla2021`** |
| `eivy2017` | A. Eivy and J. Weinman, "Be wary of the economics of 'serverless' cloud computing," *IEEE Cloud Computing*, vol. 4, no. 2, pp. 6–12, 2017. | **new — Ch2 §2.4** |
| `jonas2019` | E. Jonas et al., "Cloud programming simplified: A Berkeley view on serverless computing," arXiv:1902.03383, 2019. | **new — Ch2 §2.4** |
| `googlecloud2024vertex` | Google Cloud, "Vertex AI: Train and Deploy ML Models," Google LLC, 2024. | interim — **P9: supplement** |
| `charney2024` | B. Charney, "HR Software Pricing Guide: How Much Does HR Software Cost?," People Managing People, 2024. | interim — **P9: weak, replace** |

## Usability and evaluation

| Key | Entry | Origin |
|---|---|---|
| `brooke1996` | J. Brooke, "SUS — A Quick and Dirty Usability Scale," in *Usability Evaluation in Industry*. London: Taylor & Francis, 1996, pp. 189–194. | interim |
| `nielsen1990` | J. Nielsen and R. Molich, "Heuristic Evaluation of User Interfaces," in *Proc. ACM CHI '90*, 1990, pp. 249–256. | **new — Ch5 §5.10** |
| `nielsen1994` | J. Nielsen, "Heuristic Evaluation," in *Usability Inspection Methods*, J. Nielsen and R. L. Mack, Eds. New York: John Wiley & Sons, 1994, pp. 25–62. | **new — Ch5 §5.10 (0–4 severity scale)** |
| `bangor2009` | A. Bangor, P. T. Kortum, and J. T. Miller, "Determining What Individual SUS Scores Mean: Adding an Adjective Rating Scale," *Journal of Usability Studies*, vol. 4, no. 3, pp. 114–123, 2009. | **new — Ch5 §5.10** |

## Fairness and algorithmic ethics

| Key | Entry | Origin |
|---|---|---|
| `kleinberg2016` | J. Kleinberg, S. Mullainathan, and M. Raghavan, "Inherent Trade-Offs in the Fair Determination of Risk Scores," arXiv:1609.05807, 2016. | **new — Ch5 §5.8** |
| `chouldechova2017` | A. Chouldechova, "Fair Prediction with Disparate Impact: A Study of Bias in Recidivism Prediction Instruments," *Big Data*, vol. 5, no. 2, pp. 153–163, 2017. | **new — Ch5 §5.8** |
| `barocas2016` | S. Barocas and A. D. Selbst, "Big data's disparate impact," *California Law Review*, vol. 104, pp. 671–732, 2016. | **new — Ch2 §2.7** |
| `raghavan2020` | M. Raghavan, S. Barocas, J. Kleinberg, and K. Levy, "Mitigating bias in algorithmic hiring: Evaluating claims and practices," in *Proc. Conf. Fairness, Accountability, and Transparency (FAT\*)*, Barcelona, Spain, 2020, pp. 469–481. | **new — Ch2 §2.7** |

---

## Status

**46 entries** (21 from the interim, 9 added for Ch3/Ch5, 16 added for Ch2 under P9).
Run `python scripts/build_dissertation.py` to re-check — it prints the parsed count,
which keys are cited, and which are defined but not yet used.

**P9 target of 40+ is met.** Every entry added on 22 August 2026 was checked against a
publisher, arXiv or indexing record before being written here; nothing is cited from recall.
Two caveats stand:

- `kodakandla2021` has been **removed**, not merely deprecated — the audit flagged it as a weak
  source and `adzic2017`, `eivy2017` and `jonas2019` now carry the serverless-economics claims.
  Its one in-text use, in Ch1 §1.1, was rewritten to cite `jonas2019`.
- `charney2024` (a vendor pricing guide, not peer-reviewed) survives because the claim it
  supports — prevailing per-employee-per-month market pricing — is precisely what a pricing
  guide is competent to evidence. It should not be used for any analytical claim.

`ilyas2026` and `bahanni2026` carry 2026 issue dates from their publishers although both were
available online in 2024; the publisher's date of record is used.
