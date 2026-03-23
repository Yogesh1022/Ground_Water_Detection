// this file is for the common user which is used by the user common users in the dashboard.
// what actually is dto?
// It is Data Transfer Object, it is used to transfer data between different layers of the application.
// It is used to transfer data between the service layer and the handler layer.
// example in our case: when the user wants to update their profile, they will send a request to the handler layer, the handler layer will then call the service layer to update the profile, the service layer will then return the updated profile to the handler layer, the handler layer will then return the updated profile to the user.
// basically it is used to transfer data , it is a struct that contains the data that we want to transfer.
// the dto is used to define the structure of the data that we want to transfer, it is used to define the fields that we want to transfer, it is used to define the validation rules for the fields that we want to transfer.

package dto
