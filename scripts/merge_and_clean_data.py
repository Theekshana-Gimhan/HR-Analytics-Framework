import pandas as pd
import numpy as np
import os

def merge_datasets():
    print("🔄 Starting Dataset Merging and Cleaning...")

    # 1. Load Datasets
    ibm_path = 'data/ibm_hr_attrition.csv'
    synthetic_path = 'data/synthetic_hr_data.csv'

    if not os.path.exists(ibm_path) or not os.path.exists(synthetic_path):
        print("❌ Error: One or more datasets are missing.")
        return

    df_ibm = pd.read_csv(ibm_path)
    df_syn = pd.read_csv(synthetic_path)

    # 2. Harmonize Columns
    # We want a unified schema. Let's define the Master Columns.
    
    # Rename Synthetic columns to match IBM where applicable
    df_syn = df_syn.rename(columns={
        'JobTitle': 'JobRole',
        'TenureMonths': 'YearsAtCompany'
    })

    # Convert Synthetic Tenure from Months to Years (to match IBM)
    df_syn['YearsAtCompany'] = df_syn['YearsAtCompany'] / 12.0

    # Add a 'DataSource' column to track origin
    df_ibm['DataSource'] = 'IBM_Benchmark'
    df_syn['DataSource'] = 'Local_Synthetic'

    # 3. Handle MonthlyIncome (Scale/Normalize)
    # IBM income is around 2k-20k (Fictional USD-like)
    # Synthetic is 60k-500k (LKR)
    # For ML, we should normalize these or keep them separate if the model can handle it.
    # Vertex AI handles different scales, but for clarity let's keep them as is.

    # 4. Merge
    # We use outer join to keep all columns from both.
    df_master = pd.concat([df_ibm, df_syn], axis=0, ignore_index=True)

    # 5. Data Cleaning
    # Drop constant or useless columns from IBM
    cols_to_drop = ['EmployeeCount', 'Over18', 'StandardHours', 'EmployeeNumber', 'EmployeeId']
    df_master = df_master.drop(columns=[c for c in cols_to_drop if c in df_master.columns])

    # Fill NaNs for categorical columns with 'Unknown' or 'N/A'
    categorical_cols = df_master.select_dtypes(include=['object']).columns
    df_master[categorical_cols] = df_master[categorical_cols].fillna('Not_Available')

    # Fill NaNs for numerical columns with 0 or median (depending on context)
    # For attendance/leave, 0 is a safe assumption for IBM data (as it's not recorded)
    local_features = ['Attendance_LateCount', 'Attendance_AbsentCount', 'Attendance_HalfDayCount', 
                      'Leave_TotalDaysApproved', 'Leave_RequestCount', 'TotalAllowances']
    for col in local_features:
        if col in df_master.columns:
            df_master[col] = df_master[col].fillna(0)

    # For IBM features missing in local data, we'll let AutoML handle the NaNs or fill with median
    ibm_features = ['EnvironmentSatisfaction', 'JobInvolvement', 'JobLevel', 'JobSatisfaction', 
                    'RelationshipSatisfaction', 'StockOptionLevel', 'TrainingTimesLastYear', 'WorkLifeBalance']
    for col in ibm_features:
        if col in df_master.columns:
            df_master[col] = df_master[col].fillna(df_master[col].median())

    # 6. Save Master Dataset
    output_path = 'data/nexus_hr_master_dataset.csv'
    df_master.to_csv(output_path, index=False)
    
    print(f"✅ Successfully merged datasets!")
    print(f"📊 Total Records: {len(df_master)}")
    print(f"📂 Saved to: {output_path}")
    
    # Summary of target variable
    print("\nTarget Distribution (Attrition):")
    print(df_master['Attrition'].value_counts())

if __name__ == "__main__":
    merge_datasets()
