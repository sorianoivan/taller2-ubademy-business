enum CourseType {
    type1,
    type2,
    type3,
}

enum SubscriptionType {
    sub_type1,
    sub_type2,
    sub_type3,
}

export type Course = {
    title: string;
    description: string;
    hashtags: string[];
    type: CourseType;//Hacer enum
    sub_type: SubscriptionType;//Hacer enum
} 


