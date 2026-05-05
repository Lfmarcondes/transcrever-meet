from pydantic import BaseModel, Field
from typing import List, Literal

class PerfilLead(BaseModel):
    tipo: Literal['investidor', 'moradia', 'indeciso'] = 'indeciso'
    nivel_experiencia: Literal['iniciante', 'intermediario', 'avancado'] = 'iniciante'
    ticket_estimado: str = ''
    prazo_decisao: str = ''

class LeadMeetingSummary(BaseModel):
    lead_nome: str = ''
    data_reuniao: str = ''
    perfil_lead: PerfilLead = Field(default_factory=PerfilLead)
    interesses: List[str] = Field(default_factory=list)
    objecoes: List[str] = Field(default_factory=list)
    dores_identificadas: List[str] = Field(default_factory=list)
    gatilhos_que_mais_reagiu: List[str] = Field(default_factory=list)
    nivel_engajamento: int = 0
    probabilidade_fechamento: int = 0
    proximos_passos: List[str] = Field(default_factory=list)
    resumo_geral: str = ''
    origem_transcricao: str = ''
    confianca_extracao: int = 0
