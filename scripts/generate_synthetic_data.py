import pandas as pd
import numpy as np
import random
import os

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

def generate_data(num_records=500):
    print(f"Generating {num_records} synthetic Sri Lankan SME HR records...")

    # 1. Base Lists
    departments = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing']
    job_titles = {
        'Engineering': ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer'],
        'Sales': ['Sales Executive', 'Account Manager'],
        'HR': ['HR Executive', 'HR Manager'],
        'Finance': ['Accountant', 'Finance Controller'],
        'Operations': ['Operations Executive', 'Project Manager'],
        'Marketing': ['Marketing Executive', 'Digital Marketer']
    }
    genders = ['Male', 'Female']
    
    sl_first_names = ['Kasun', 'Nimal', 'Chaminda', 'Ruwan', 'Pradeep', 'Sanduni', 'Dilini', 'Nethmi', 'Anusha', 'Madhavi']
    sl_last_names = ['Fernando', 'Perera', 'Silva', 'Jayawardena', 'Rajapaksa', 'Wickramasinghe', 'Bandara', 'Kumara']

    data = []

    for i in range(num_records):
        # Basic Demographics
        age = np.random.randint(22, 55)
        gender = random.choice(genders)
        dept = random.choice(departments)
        title = random.choice(job_titles[dept])
        
        # Tenure (SMEs often have higher turnover, so we skew low)
        tenure_months = np.random.randint(1, 120) 
        
        # Financials (LKR)
        if 'Senior' in title or 'Manager' in title or 'Controller' in title:
            base_salary = np.random.randint(150000, 450000)
        else:
            base_salary = np.random.randint(100000, 250000) if 'Executive' in title else np.random.randint(60000, 120000)
            
        allowances = base_salary * np.random.uniform(0.05, 0.15)
        
        # Attendance (Monthly Averages)
        # Most employees are good, but some have patterns
        is_unreliable = np.random.random() < 0.15 # 15% of employees are "unreliable"
        
        if is_unreliable:
            late_count = np.random.randint(3, 10)
            absent_count = np.random.randint(1, 5)
        else:
            late_count = np.random.randint(0, 3)
            absent_count = np.random.randint(0, 2)
            
        half_day_count = np.random.randint(0, 3)
        
        # Leave Behavior
        leave_request_count = np.random.randint(1, 5)
        total_leave_days = leave_request_count * np.random.uniform(1, 3)
        
        # --- ATTRITION LOGIC (The "Hidden Pattern" for AI to find) ---
        attrition_prob = 0.05 # Baseline 5% risk
        
        # Pattern 1: High Lates + Short Tenure (New joiners struggling to adapt)
        if late_count > 5 and tenure_months < 12:
            attrition_prob += 0.40
            
        # Pattern 2: Salary Gap (Low salary for their age/title)
        if base_salary < 100000 and age > 35:
            attrition_prob += 0.25
            
        # Pattern 3: Recent Absenteeism Spike
        if absent_count > 3:
            attrition_prob += 0.30
            
        # Pattern 4: Career Ceiling (Long tenure in junior title)
        if tenure_months > 60 and 'Senior' not in title and 'Manager' not in title:
            attrition_prob += 0.20

        attrition = 'Yes' if np.random.random() < attrition_prob else 'No'

        data.append({
            'EmployeeId': f"EMP{1000+i}",
            'Age': age,
            'Gender': gender,
            'JobTitle': title,
            'Department': dept,
            'MonthlyIncome': round(base_salary, 2),
            'TotalAllowances': round(allowances, 2),
            'TenureMonths': tenure_months,
            'Attendance_LateCount': late_count,
            'Attendance_AbsentCount': absent_count,
            'Attendance_HalfDayCount': half_day_count,
            'Leave_TotalDaysApproved': round(total_leave_days, 1),
            'Leave_RequestCount': leave_request_count,
            'Attrition': attrition
        })

    df = pd.DataFrame(data)
    
    # Save to data directory
    output_path = 'data/synthetic_hr_data.csv'
    df.to_csv(output_path, index=False)
    print(f"✅ Created {output_path} with {len(df)} records.")
    
    # Show distribution
    print("\nAttrition Distribution:")
    print(df['Attrition'].value_counts(normalize=True))

if __name__ == "__main__":
    generate_data(500)
