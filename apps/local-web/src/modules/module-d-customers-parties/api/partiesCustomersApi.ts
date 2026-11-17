import { apiClient } from "@/core/api/apiClient";
import type {
  AddCustomerInteractionRequest,
  CustomerInteractionDto,
  CreateProjectCustomerRequest,
  PartyDirectoryItemDto,
  ProjectCustomerDto,
  ProjectCustomerListItemDto,
  UpdateProjectCustomerRequest,
  UpdatePartyIdentityRequest,
} from "@/types/erp";

export const partiesCustomersApi = {
  searchPartyDirectory: (query: string): Promise<PartyDirectoryItemDto[]> =>
    apiClient.searchPartyDirectory(query),
  updatePartyIdentity: (partyId: string, payload: UpdatePartyIdentityRequest): Promise<PartyDirectoryItemDto> =>
    apiClient.updatePartyIdentity(partyId, payload),
  listProjectCustomers: (projectId: string): Promise<ProjectCustomerListItemDto[]> =>
    apiClient.listProjectCustomers(projectId),
  getProjectCustomer: (projectId: string, customerId: string): Promise<ProjectCustomerDto> =>
    apiClient.getProjectCustomer(projectId, customerId),
  createProjectCustomer: (projectId: string, payload: CreateProjectCustomerRequest): Promise<ProjectCustomerDto> =>
    apiClient.createProjectCustomer(projectId, payload),
  updateProjectCustomer: (
    projectId: string,
    customerId: string,
    payload: UpdateProjectCustomerRequest
  ): Promise<ProjectCustomerDto> => apiClient.updateProjectCustomer(projectId, customerId, payload),
  addCustomerInteraction: (
    projectId: string,
    customerId: string,
    payload: AddCustomerInteractionRequest
  ): Promise<CustomerInteractionDto> => apiClient.addCustomerInteraction(projectId, customerId, payload),
};
