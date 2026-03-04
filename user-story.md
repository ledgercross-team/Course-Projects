# User Story Template

## User Story

**As a** [role]
**I need** [function]
**So that** [benefit]

### Details and Assumptions

* [document what you know]

### Acceptance Criteria

```gherkin
Given [some context]
When [certain action is taken]
Then [the outcome of action is observed]
```

---

## Example User Stories

### Story 1: Create an Account
**As a** Customer
**I need** to create an account on the service
**So that** I can store my account information

#### Details and Assumptions
* The service supports creating accounts with name, email, address, phone number, and date joined

#### Acceptance Criteria
```gherkin
Given I provide valid account information
When I send a POST request to /accounts
Then a new account is created and I receive a 201 response
```

---

### Story 2: Read an Account
**As a** Customer
**I need** to read my account from the service
**So that** I can view my account information

#### Details and Assumptions
* Each account has a unique ID that can be used to retrieve it

#### Acceptance Criteria
```gherkin
Given an account exists in the service
When I send a GET request to /accounts/<id>
Then I receive the account details with a 200 response
```

---

### Story 3: List All Accounts
**As a** Customer
**I need** to list all accounts in the service
**So that** I can see all available accounts

#### Details and Assumptions
* The list endpoint returns all accounts currently stored

#### Acceptance Criteria
```gherkin
Given multiple accounts exist in the service
When I send a GET request to /accounts
Then I receive a list of all accounts with a 200 response
```

---

### Story 4: Update an Account
**As a** Customer
**I need** to update my account in the service
**So that** I can change my account information

#### Details and Assumptions
* Only existing accounts can be updated
* All required fields must be provided

#### Acceptance Criteria
```gherkin
Given an account exists in the service
When I send a PUT request to /accounts/<id> with updated information
Then the account is updated and I receive a 200 response
```

---

### Story 5: Delete an Account
**As a** Customer
**I need** to delete my account from the service
**So that** my account is permanently removed

#### Details and Assumptions
* Deleting a non-existent account returns a 204 (no error)

#### Acceptance Criteria
```gherkin
Given an account exists in the service
When I send a DELETE request to /accounts/<id>
Then the account is removed and I receive a 204 response
```
